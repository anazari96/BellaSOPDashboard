import { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropicClient } from "./client";
import { buildGenerationPrompt, type GeneratedTrainingContent } from "./prompts";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ZodType } from "zod";

interface GenerateOptions {
  userId: string;
  sopId?: string;
}

export async function selectSOPForUser(supabase: SupabaseClient, userId: string): Promise<string | null> {
  // Priority 1: Admin-flagged high-priority notes
  const { data: highNotes } = await supabase
    .from("admin_staff_notes")
    .select("sop_id")
    .eq("staff_id", userId)
    .eq("addressed", false)
    .eq("priority", "high")
    .not("sop_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(1);

  if (highNotes && highNotes.length > 0 && highNotes[0].sop_id) {
    return highNotes[0].sop_id;
  }

  // Priority 2: SOPs where staff scored below 70% on last session
  const { data: failedSessions } = await supabase
    .from("training_sessions")
    .select("sop_id, score")
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("score", "is", null)
    .lt("score", 70)
    .order("completed_at", { ascending: false })
    .limit(5);

  if (failedSessions && failedSessions.length > 0) {
    return failedSessions[0].sop_id;
  }

  // Priority 3: Published SOPs never trained on
  const { data: allPublished } = await supabase.from("sops").select("id").eq("status", "published");

  const { data: trainedSops } = await supabase.from("training_sessions").select("sop_id").eq("user_id", userId);

  if (allPublished) {
    const trainedIds = new Set(trainedSops?.map((t) => t.sop_id) || []);
    const untrained = allPublished.filter((s) => !trainedIds.has(s.id));
    if (untrained.length > 0) {
      return untrained[0].id;
    }
  }

  // Priority 4: Stale knowledge - SOPs not trained on in 30+ days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: staleSessions } = await supabase
    .from("training_sessions")
    .select("sop_id, completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .lt("completed_at", thirtyDaysAgo.toISOString())
    .order("completed_at", { ascending: true })
    .limit(1);

  if (staleSessions && staleSessions.length > 0) {
    return staleSessions[0].sop_id;
  }

  // Priority 5: SOPs with incomplete step progress
  const { data: incompleteProgress } = await supabase
    .from("staff_progress")
    .select("sop_id")
    .eq("user_id", userId)
    .eq("completed", false)
    .limit(1);

  if (incompleteProgress && incompleteProgress.length > 0) {
    return incompleteProgress[0].sop_id;
  }

  // Priority 6: Any medium/low admin notes
  const { data: otherNotes } = await supabase
    .from("admin_staff_notes")
    .select("sop_id")
    .eq("staff_id", userId)
    .eq("addressed", false)
    .not("sop_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(1);

  if (otherNotes && otherNotes.length > 0 && otherNotes[0].sop_id) {
    return otherNotes[0].sop_id;
  }

  return null;
}

async function gatherTrainingContext(supabase: SupabaseClient, userId: string, sopId: string) {
  const [sopRes, stepsRes, ingredientsRes, behaviorsRes] = await Promise.all([
    supabase.from("sops").select("*").eq("id", sopId).single(),
    supabase.from("sop_steps").select("*").eq("sop_id", sopId).order("step_number"),
    supabase.from("sop_ingredients").select("*").eq("sop_id", sopId).order("sort_order"),
    supabase.from("sop_behaviors").select("*").eq("sop_id", sopId).order("sort_order"),
  ]);

  const sop = sopRes.data;
  const steps = stepsRes.data || [];

  if (!sop) throw new Error(`SOP ${sopId} not found`);

  // Get previous wrong answers for this user on this SOP
  const { data: prevSessions } = await supabase
    .from("training_sessions")
    .select("id, score")
    .eq("user_id", userId)
    .eq("sop_id", sopId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  const previousScore = prevSessions && prevSessions.length > 0 ? prevSessions[0].score : null;
  const timesTrainedOnSop = prevSessions?.length || 0;

  // Find steps they got wrong in previous sessions
  const previousWrongStepIds: string[] = [];
  if (prevSessions && prevSessions.length > 0) {
    const sessionIds = prevSessions.slice(0, 3).map((s) => s.id);
    const { data: wrongAnswers } = await supabase
      .from("training_answers")
      .select("question_id, training_questions!inner(related_step_id)")
      .eq("user_id", userId)
      .eq("is_correct", false)
      .in("training_questions.session_id", sessionIds);

    if (wrongAnswers) {
      for (const answer of wrongAnswers) {
        const q = answer.training_questions as unknown as {
          related_step_id: string | null;
        };
        if (q?.related_step_id) {
          previousWrongStepIds.push(q.related_step_id);
        }
      }
    }
  }

  // Get admin notes for this staff + SOP (or general notes)
  const { data: adminNotes } = await supabase
    .from("admin_staff_notes")
    .select("*")
    .eq("staff_id", userId)
    .eq("addressed", false)
    .or(`sop_id.eq.${sopId},sop_id.is.null`);

  return {
    sop: {
      ...sop,
      steps,
      ingredients: ingredientsRes.data || [],
      behaviors: behaviorsRes.data || [],
    },
    previousWrongStepIds: [...new Set(previousWrongStepIds)],
    previousScore,
    timesTrainedOnSop,
    adminNotes: adminNotes || [],
  };
}

async function callClaude(prompt: string, outputFormat?: ZodType): Promise<GeneratedTrainingContent> {
  const client = getAnthropicClient();

  const response = await client.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
    ...(outputFormat
      ? {
          output_config: {
            format: zodOutputFormat(outputFormat),
          },
        }
      : {}),
  });

  const parsed = response.parsed_output!

  if (!parsed) {
    throw new Error("Invalid training content structure from Claude");
  }

  return parsed;
}

export async function generateTrainingSession(
  supabase: SupabaseClient,
  options: GenerateOptions,
): Promise<{ sessionId: string; sopId: string } | null> {
  const { userId, sopId: forcedSopId } = options;

  // Check if user already has a pending/in_progress session
  const { data: existingSessions } = await supabase
    .from("training_sessions")
    .select("id, status")
    .eq("user_id", userId)
    .in("status", ["pending", "in_progress"]);

  if (existingSessions && existingSessions.length > 0) {
    if (forcedSopId) {
      // Admin override: delete pending sessions (not in_progress)
      const pendingIds = existingSessions.filter((s) => s.status === "pending").map((s) => s.id);

      if (pendingIds.length > 0) {
        await supabase.from("training_sessions").delete().in("id", pendingIds);
      }

      const hasInProgress = existingSessions.some((s) => s.status === "in_progress");
      if (hasInProgress) {
        return null;
      }
    } else {
      return null;
    }
  }

  const sopId = forcedSopId || (await selectSOPForUser(supabase, userId));
  if (!sopId) return null;

  const context = await gatherTrainingContext(supabase, userId, sopId);
  const { prompt, outputFormat } = buildGenerationPrompt(context);
  const content = await callClaude(prompt, outputFormat);

  // Map step numbers to step IDs
  const stepNumberToId = new Map<number, string>();
  for (const s of context.sop.steps) {
    stepNumberToId.set(s.step_number, s.id);
  }

  // Insert session
  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .insert({
      user_id: userId,
      sop_id: sopId,
      status: "pending",
      review_content: content.review_content,
      total_questions: content.questions.length,
      created_by: forcedSopId ? options.userId : null,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    throw new Error(`Failed to create training session: ${sessionError?.message}`);
  }

  // Insert questions
  const questionsToInsert = content.questions.map((q) => ({
    session_id: session.id,
    question_number: q.question_number,
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    related_step_id: q.related_step_number ? stepNumberToId.get(q.related_step_number) || null : null,
  }));

  const { error: questionsError } = await supabase.from("training_questions").insert(questionsToInsert);

  if (questionsError) {
    await supabase.from("training_sessions").delete().eq("id", session.id);
    throw new Error(`Failed to create questions: ${questionsError.message}`);
  }

  // Mark relevant admin notes as addressed
  const noteIds = context.adminNotes.filter((n) => n.sop_id === sopId).map((n) => n.id);

  if (noteIds.length > 0) {
    await supabase.from("admin_staff_notes").update({ addressed: true }).in("id", noteIds);
  }

  return { sessionId: session.id, sopId };
}
