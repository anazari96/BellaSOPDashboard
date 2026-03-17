import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateTrainingSession } from "@/lib/training/generator";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  }
  return createClient(url, serviceKey);
}

function validateCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-cron-secret");
  return secret === process.env.CRON_SECRET;
}

async function validateAdminAuth(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabase = getServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user.id : null;
}

export async function POST(request: NextRequest) {
  try {
    const isCron = validateCronSecret(request);
    const adminId = await validateAdminAuth(request);

    if (!isCron && !adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { userId, sopId } = body as {
      userId?: string;
      sopId?: string;
    };

    const supabase = getServiceClient();

    // Single user generation (admin-triggered)
    if (userId) {
      const result = await generateTrainingSession(supabase, {
        userId,
        sopId,
      });

      return NextResponse.json({
        success: true,
        generated: result ? 1 : 0,
        result,
      });
    }

    // Batch generation (cron)
    const { data: staffMembers } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "staff");

    if (!staffMembers || staffMembers.length === 0) {
      return NextResponse.json({
        success: true,
        generated: 0,
        message: "No staff members found",
      });
    }

    const results: { userId: string; sessionId?: string; skipped?: boolean; error?: string }[] = [];

    for (const staff of staffMembers) {
      try {
        const result = await generateTrainingSession(supabase, {
          userId: staff.id,
        });

        if (result) {
          results.push({ userId: staff.id, sessionId: result.sessionId });
        } else {
          results.push({ userId: staff.id, skipped: true });
        }
      } catch (err) {
        results.push({
          userId: staff.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const generated = results.filter((r) => r.sessionId).length;

    return NextResponse.json({
      success: true,
      generated,
      total: staffMembers.length,
      results,
    });
  } catch (err) {
    console.error("Training generation error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
