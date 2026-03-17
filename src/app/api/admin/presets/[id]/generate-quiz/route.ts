import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generatePresetQuiz } from "@/lib/presets/quiz-generator";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  }
  return createClient(url, serviceKey);
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await validateAdminAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const presetId = (await params).id;
    console.log("params",presetId)
    if (!presetId) {
      return NextResponse.json({ error: "Missing preset ID" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const result = await generatePresetQuiz(supabase, presetId);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Preset quiz generation error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
