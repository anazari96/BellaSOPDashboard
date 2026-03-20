import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import webpush from "@/lib/webpush";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createAdminClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sopTitle, presetId, passed } = await request.json();

    // Get user's profile to know their name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const userName = profile?.full_name || "A user";
    const context = presetId ? "Preset" : "Training Session";
    const resultText = passed ? "successfully" : "unsuccessfully";
    const message = `${userName} has ${resultText} completed a ${context} for SOP: ${sopTitle || 'Unknown SOP'}`;

    // Get all Admins
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (!admins || admins.length === 0) {
      return NextResponse.json({ success: true, message: "No admins to notify." });
    }

    const adminIds = admins.map(a => a.id);

    // Get admin subsciptions
    const { data: subscriptions } = await supabaseAdmin
      .from("user_push_subscriptions")
      .select("subscription, user_id")
      .in("user_id", adminIds);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: "No admins subscribed to push." });
    }

    const payload = JSON.stringify({
      title: "Training Completed",
      body: message,
      icon: "/favicon.ico",
      url: "/admin/dashboard", // or wherever admin tracks progress
    });

    const sendPromises = subscriptions.map(async (subRecord) => {
      try {
        await webpush.sendNotification(subRecord.subscription, payload);
      } catch (err: any) {
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

    return NextResponse.json({ success: true, count: subscriptions.length });
  } catch (error) {
    console.error("Training completion notification error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
