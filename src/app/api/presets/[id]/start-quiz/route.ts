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

    // 1. Verify preset and fetch its template questions
    const { data: questions, error: questionsError } = await supabase
      .from("sop_preset_questions")
      .select("*")
      .eq("preset_id", presetId);

    if (questionsError || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: "No quiz questions found for this preset" },
        { status: 404 }
      );
    }

    // 2. Check if user already has an active session for this preset
    const { data: existingSessions } = await supabase
      .from("training_sessions")
      .select("id, status")
      .eq("user_id", userId)
      .eq("preset_id", presetId)
      .in("status", ["pending", "in_progress"])
      .limit(1);

    if (existingSessions && existingSessions.length > 0) {
      return NextResponse.json({ 
        sessionId: existingSessions[0].id,
        isExisting: true
      });
    }

    // 3. Create a new training session
    const { data: session, error: sessionError } = await supabase
      .from("training_sessions")
      .insert({
        user_id: userId,
        preset_id: presetId,
        sop_id: questions[0].sop_id, // We'll just link to the first SOP for schema compatibility, but use preset_id primarily
        status: "pending",
        review_content: "# Preset Quiz\n\nYou've completed reading all SOPs in this preset. Now it's time to test your knowledge!",
        total_questions: questions.length,
        created_by: userId,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      throw new Error(`Failed to create training session: ${sessionError?.message}`);
    }

    // 4. Copy preset questions to training_questions
    const questionsToInsert = questions.map((q) => ({
      session_id: session.id,
      question_number: q.question_number,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      related_step_id: q.related_step_id,
    }));

    const { error: copyError } = await supabase
      .from("training_questions")
      .insert(questionsToInsert);

    if (copyError) {
      // Cleanup
      await supabase.from("training_sessions").delete().eq("id", session.id);
      throw new Error(`Failed to copy questions: ${copyError.message}`);
    }

    return NextResponse.json({ sessionId: session.id, isExisting: false });
  } catch (err) {
    console.error("Start preset quiz error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
