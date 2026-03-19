import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  return createClient(url, serviceKey);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabase = getServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return user?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question } = (await request.json()) as { question?: string };
    if (!question?.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const trimmedQuestion = question.trim().slice(0, 500); // safety cap

    // ── 1. Embed the question ────────────────────────────────────────────────
    const embedResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: trimmedQuestion,
    });
    const queryEmbedding = embedResponse.data[0].embedding;

    // ── 2. Semantic search over SOP chunks ───────────────────────────────────
    const supabase = getServiceClient();
    const { data: chunks, error: matchError } = await supabase.rpc("match_sop_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.2, // Balanced threshold to catch imperfect matches but block random noise
      match_count: 6,
    });

    if (matchError) {
      console.error("match_sop_chunks error:", matchError);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    // ── 3. Fetch SOP metadata for matched chunks ─────────────────────────────
    interface MatchedChunk {
      id: string;
      sop_id: string;
      chunk_text: string;
      similarity: number;
    }

    const matchedChunks: MatchedChunk[] = chunks ?? [];

    let answer: string;
    let sopReferences: { sop_id: string; title: string; category?: string; emoji?: string }[] = [];

    if (matchedChunks.length === 0) {
      answer =
        "I couldn't find a relevant SOP for that question. Try asking about a specific cafe procedure, recipe, or cleaning routine.";
    } else {
      // Gather unique SOP IDs from matched chunks
      const uniqueSopIds = [...new Set(matchedChunks.map((c) => c.sop_id))];

      const { data: sopRows } = await supabase
        .from("sops")
        .select("id, title, category:categories(name, emoji)")
        .in("id", uniqueSopIds)
        .eq("status", "published");

      // Supabase returns joined relations as arrays; normalise to single object
      type SopRowRaw = {
        id: string;
        title: string;
        category: { name: string; emoji: string }[] | { name: string; emoji: string } | null;
      };
      type SopRow = {
        id: string;
        title: string;
        category: { name: string; emoji: string } | null;
      };

      const normalizeSop = (s: SopRowRaw): SopRow => ({
        id: s.id,
        title: s.title,
        category: Array.isArray(s.category) ? (s.category[0] ?? null) : s.category,
      });

      const sopMap = new Map<string, SopRow>();
      (sopRows as unknown as SopRowRaw[])?.forEach((s) => {
        const normalized = normalizeSop(s);
        sopMap.set(normalized.id, normalized);
      });

      // Build context string for the LLM
      const contextBlocks = matchedChunks
        .map((chunk) => {
          const sop = sopMap.get(chunk.sop_id);
          const sopLabel = sop
            ? `[SOP: ${sop.category?.emoji ?? ""} ${sop.title}]`
            : "[SOP]";
          return `${sopLabel}\n${chunk.chunk_text}`;
        })
        .join("\n\n---\n\n");

      // ── 4. Call Claude ───────────────────────────────────────────────────
      const message = await anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 256,
        system: `You are a quick-reference assistant for Bella Cafe staff.
Your ONLY job is to answer questions using the provided SOP context below.
Rules:
- Be extremely concise: 1–3 short sentences maximum.
- Always state which SOP your answer comes from (e.g. "Per the Espresso Brewing SOP:").
- If the context does not contain a relevant answer, say: "I couldn't find a relevant SOP for that question."
- Never guess or make up procedures not in the context.
- Write in plain, simple English suitable for a busy barista.`,
        messages: [
          {
            role: "user",
            content: `SOP Context:\n\n${contextBlocks}\n\nStaff question: ${trimmedQuestion}`,
          },
        ],
      });

      answer =
        message.content[0].type === "text"
          ? message.content[0].text
          : "Unable to generate an answer.";

      // Build references list (deduplicated by SOP)
      sopReferences = uniqueSopIds
        .filter((id) => sopMap.has(id))
        .map((id) => {
          const sop = sopMap.get(id)!;
          return {
            sop_id: id,
            title: sop.title,
            category: sop.category?.name,
            emoji: sop.category?.emoji,
          };
        });
    }

    // ── 5. Log to sop_qa_log ─────────────────────────────────────────────────
    await supabase.from("sop_qa_log").insert({
      user_id: userId,
      question: trimmedQuestion,
      answer,
      sop_references: sopReferences,
    });

    return NextResponse.json({ answer, sopReferences });
  } catch (err) {
    console.error("ask-sop error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
