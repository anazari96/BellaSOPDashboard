import { NextResponse } from "next/server";
import webpush from "@/lib/webpush";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, message, targetUserId } = await request.json();

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message required" }, { status: 400 });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: "/favicon.ico",
      url: "/",
    });

    // Fetch subscriptions
    let query = supabase.from("user_push_subscriptions").select("subscription, user_id");
    if (targetUserId && targetUserId !== "all") {
      query = query.eq("user_id", targetUserId);
    }

    const { data: subscriptions, error } = await query;

    if (error || !subscriptions) {
      throw error || new Error("Failed to fetch subscriptions");
    }

    // Send notifications
    const sendPromises = subscriptions.map(async (subRecord) => {
      try {
        await webpush.sendNotification(subRecord.subscription, payload);
      } catch (err: any) {
        console.error("Failed to push to sub:", err);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from("user_push_subscriptions")
            .delete()
            .eq("user_id", subRecord.user_id)
            .eq("subscription->>endpoint", subRecord.subscription.endpoint);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return NextResponse.json({ success: true, count: subscriptions.length });
  } catch (error) {
    console.error("Manual push error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
