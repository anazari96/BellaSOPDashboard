import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // Check if subscription exists
    const { data: existing } = await supabase
      .from("user_push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .contains("subscription", { endpoint: subscription.endpoint })
      .single();

    if (!existing) {
      // Insert new subscription
      const { error } = await supabase
        .from("user_push_subscriptions")
        .insert({
          user_id: user.id,
          subscription: subscription,
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
