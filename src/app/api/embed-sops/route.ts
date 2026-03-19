import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  return createClient(url, serviceKey);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function validateAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);
  const supabase = getServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

/**
 * Builds flat text chunks from a SOP and its related content.
 * Keeps chunks small (~300 tokens) for retrieval precision.
 */
function buildChunks(
  sop: {
    id: string;
    title: string;
    description: string | null;
    updated_at: string;
    category: { name: string; emoji: string } | null;
    steps: { title: string; content: string; tip: string | null; warning: string | null }[];
    ingredients: { name: string; amount: string; unit: string | null }[];
    behaviors: { trigger_title: string; response_content: string }[];
  }
): { sopId: string; sopUpdatedAt: string; text: string }[] {
  const chunks: { sopId: string; sopUpdatedAt: string; text: string }[] = [];
  const header = `SOP: ${sop.title}${sop.category ? ` (${sop.category.emoji} ${sop.category.name})` : ""}`;
  const meta = { sopId: sop.id, sopUpdatedAt: sop.updated_at };

  // Overview chunk
  if (sop.description) {
    chunks.push({ ...meta, text: `${header}\nOverview: ${sop.description}` });
  }

  // Ingredients chunk (for recipe SOPs)
  if (sop.ingredients?.length > 0) {
    const ingredientList = sop.ingredients
      .map((i) => `- ${i.amount}${i.unit ? " " + i.unit : ""} ${i.name}`)
      .join("\n");
    chunks.push({ ...meta, text: `${header}\nIngredients:\n${ingredientList}` });
  }

  // Each step as its own chunk
  for (const step of sop.steps ?? []) {
    let text = `${header}\nStep: ${step.title}\n${step.content}`;
    if (step.tip) text += `\nTip: ${step.tip}`;
    if (step.warning) text += `\nWarning: ${step.warning}`;
    chunks.push({ ...meta, text });
  }

  // Behavior chunks (greeting/service)
  for (const behavior of sop.behaviors ?? []) {
    const text = `${header}\nScenario: ${behavior.trigger_title}\nResponse: ${behavior.response_content}`;
    chunks.push({ ...meta, text });
  }

  // Always produce at least a title chunk so the SOP is searchable
  if (chunks.length === 0) {
    chunks.push({ ...meta, text: `${header}\n${sop.title}` });
  }

  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await validateAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const supabase = getServiceClient();

    // ── 1. Fetch all published SOPs with full content ────────────────────────
    const { data: sops, error: sopError } = await supabase
      .from("sops")
      .select(
        `id, title, description, updated_at,
         category:categories(name, emoji),
         steps:sop_steps!sop_steps_sop_id_fkey(title, content, tip, warning),
         ingredients:sop_ingredients(name, amount, unit),
         behaviors:sop_behaviors(trigger_title, response_content)`
      )
      .eq("status", "published");

    if (sopError) {
      console.error("SOP fetch error:", sopError);
      return NextResponse.json({ error: "Failed to fetch SOPs" }, { status: 500 });
    }

    if (!sops || sops.length === 0) {
      return NextResponse.json({ success: true, embedded: 0, skipped: 0, message: "No published SOPs found" });
    }

    // ── 2. Find which SOPs already have fresh embeddings ─────────────────────
    // An embedding is "fresh" if sop_updated_at matches sops.updated_at
    const sopIds = sops.map((s) => s.id);
    const { data: existingEmbeds } = await supabase
      .from("sop_embeddings")
      .select("sop_id, sop_updated_at")
      .in("sop_id", sopIds);

    // Build a map: sop_id → most recent embedded updated_at
    const embeddedMap = new Map<string, string>();
    for (const row of existingEmbeds ?? []) {
      if (row.sop_updated_at) {
        embeddedMap.set(row.sop_id, row.sop_updated_at);
      }
    }

    type SopWithContent = Parameters<typeof buildChunks>[0];

    // ── 3. Determine which SOPs need (re-)embedding ──────────────────────────
    const toEmbed: SopWithContent[] = [];
    const skippedIds: string[] = [];

    for (const sop of sops as unknown as SopWithContent[]) {
      const lastEmbeddedAt = embeddedMap.get(sop.id);
      if (lastEmbeddedAt && lastEmbeddedAt >= sop.updated_at) {
        skippedIds.push(sop.id);
      } else {
        toEmbed.push(sop);
      }
    }

    if (toEmbed.length === 0) {
      return NextResponse.json({
        success: true,
        embedded: 0,
        skipped: skippedIds.length,
        message: "All SOPs are already up to date",
      });
    }

    // ── 4. Delete stale embeddings for SOPs that need re-embedding ───────────
    const staleIds = toEmbed.map((s) => s.id);
    await supabase.from("sop_embeddings").delete().in("sop_id", staleIds);

    // ── 5. Build & embed chunks in batches ──────────────────────────────────
    const allChunks = toEmbed.flatMap(buildChunks);
    const BATCH_SIZE = 20;
    let totalEmbedded = 0;

    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => c.text);

      const embedResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });

      const rows = batch.map((chunk, idx) => ({
        sop_id: chunk.sopId,
        sop_updated_at: chunk.sopUpdatedAt,
        chunk_text: chunk.text,
        embedding: embedResponse.data[idx].embedding,
      }));

      const { error: insertError } = await supabase.from("sop_embeddings").insert(rows);
      if (insertError) {
        console.error("Insert error:", insertError);
      } else {
        totalEmbedded += rows.length;
      }
    }

    return NextResponse.json({
      success: true,
      embedded: totalEmbedded,
      updatedSops: toEmbed.length,
      skipped: skippedIds.length,
      chunks: allChunks.length,
    });
  } catch (err) {
    console.error("embed-sops error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
