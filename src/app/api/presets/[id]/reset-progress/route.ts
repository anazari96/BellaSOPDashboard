import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  }
  return createClient(url, serviceKey);
}

async function validateAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabase = getServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  return user?.id || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await validateAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const presetId = (await params).id;
    if (!presetId) {
      return NextResponse.json({ error: "Missing preset ID" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 1. Fetch all SOPs in this preset
    const { data: items, error: itemsError } = await supabase
      .from("sop_preset_items")
      .select("sop_id")
      .eq("preset_id", presetId);

    if (itemsError || !items) {
      throw new Error(`Failed to fetch preset items: ${itemsError?.message}`);
    }

    const sopIds = items.map((item) => item.sop_id);

    if (sopIds.length > 0) {
      // 2. Delete progress for these SOPs for this user
      const { error: deleteError } = await supabase
        .from("staff_progress")
        .delete()
        .eq("user_id", userId)
        .in("sop_id", sopIds);

      if (deleteError) {
        throw new Error(`Failed to reset progress: ${deleteError.message}`);
      }
    }

    return NextResponse.json({ success: true, resetSopCount: sopIds.length });
  } catch (err) {
    console.error("Reset preset progress error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
