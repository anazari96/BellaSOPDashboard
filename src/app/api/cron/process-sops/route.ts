import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import webpush from "@/lib/webpush";
import { createClient } from "@supabase/supabase-js"; // need a service role client to fetch all subs without RLS

// Use service role for cron tasks because there is no logged-in user
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  // Simple auth: Check for a valid CRON_SECRET if required by your setup (e.g., Vercel Cron)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!redis) {
    return NextResponse.json({ error: "Redis not configured" }, { status: 500 });
  }

  try {
    // 1. Get all pending SOP IDs from the Set
    const pendingSops = await redis.smembers("pending_sops_notifications");

    if (!pendingSops || pendingSops.length === 0) {
      return NextResponse.json({ message: "No pending SOPs to notify" });
    }

    // 2. Clear the set immediately to prevent duplicate sends if another request comes in
    await redis.del("pending_sops_notifications");

    // 3. Formulate the push notification payload
    const count = pendingSops.length;
    const bodyText =
      count === 1
        ? "A new SOP has been published. Read it now!"
        : `${count} new SOPs have been added recently. Check them out!`;

    const payload = JSON.stringify({
      title: "New SOP(s) Available",
      body: bodyText,
      icon: "/favicon.ico",
      url: "/",
    });

    // 4. Fetch all user subscriptions (could limit to staff only depending on your schema)
    // For now we notify everyone who subscribed.
    const { data: subscriptions, error } = await supabaseAdmin
      .from("user_push_subscriptions")
      .select("subscription, user_id");

    if (error || !subscriptions) {
      throw error || new Error("Failed to fetch subscriptions");
    }

    // 5. Send notifications
    const sendPromises = subscriptions.map(async (subRecord) => {
      try {
        await webpush.sendNotification(subRecord.subscription, payload);
      } catch (err: any) {
        console.error("Failed to push to sub:", err);
        // If the subscription is gone (410) or invalid (404), maybe remove from DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin
            .from("user_push_subscriptions")
            .delete()
            .eq("user_id", subRecord.user_id)
            .eq("subscription->>endpoint", subRecord.subscription.endpoint);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return NextResponse.json({
      success: true,
      message: `Sent to ${subscriptions.length} subscribers about ${count} SOPs.`,
    });
  } catch (error) {
    console.error("Cron SOP batch error:", error);
    return NextResponse.json({ error: "Failed to process SOPs" }, { status: 500 });
  }
}
