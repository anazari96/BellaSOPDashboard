import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redis } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Must be logged in to queue an SOP (only admins can publish via UI anyway)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sopId } = await request.json();

    if (!sopId) {
      return NextResponse.json({ error: "Missing sopId" }, { status: 400 });
    }

    if (redis) {
      // Add to a redis set to ensure uniqueness if updated multiple times quickly
      await redis.sadd("pending_sops_notifications", sopId);
    } else {
      console.warn("Redis is not configured. SOP not queued for batch push notification.");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Queue SOP error:", error);
    return NextResponse.json({ error: "Failed to queue SOP" }, { status: 500 });
  }
}
