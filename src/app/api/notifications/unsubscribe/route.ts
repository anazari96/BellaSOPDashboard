import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
    }

    // Delete matching subscription
    // Because we store JSONB we can query dynamically, or simply delete where user_id matches and we can do a cleanup,
    // actually doing JSONB query in supabase is: filter on `subscription->>'endpoint' = endpoint`.
    const { error } = await supabase
      .from("user_push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("subscription->>endpoint", endpoint);

    if (error) {
      console.error(error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
