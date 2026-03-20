import { SupabaseClient } from "@supabase/supabase-js";
import { buildPresetQuizBatchPrompt } from "../training/prompts";
import { callClaude } from "../training/generator";
import { SOP, SOPStep, SOPIngredient, SOPBehavior } from "../types";

export async function generatePresetQuiz(supabase: SupabaseClient, presetId: string) {
  // 1. Fetch preset and its SOPs
  const { data: items, error: itemsError } = await supabase
    .from("sop_preset_items")
    .select("sop_id")
    .eq("preset_id", presetId)
    .order("sort_order");

  if (itemsError || !items) {
    throw new Error(`Failed to fetch preset items: ${itemsError?.message}`);
  }

  const sopIds = items.map((item) => item.sop_id);

  // 2. Fetch all SOP details in parallel
  const sopDetails = await Promise.all(
    sopIds.map(async (sopId) => {
      const [sopRes, stepsRes, ingredientsRes, behaviorsRes] = await Promise.all([
        supabase.from("sops").select("*").eq("id", sopId).single(),
        supabase.from("sop_steps").select("*").eq("sop_id", sopId).order("step_number"),
        supabase.from("sop_ingredients").select("*").eq("sop_id", sopId).order("sort_order"),
        supabase.from("sop_behaviors").select("*").eq("sop_id", sopId).order("sort_order"),
      ]);

      if (sopRes.error || !sopRes.data) return null;

      return {
        ...sopRes.data,
        steps: stepsRes.data || [],
        ingredients: ingredientsRes.data || [],
        behaviors: behaviorsRes.data || [],
      } as SOP & {
        steps: SOPStep[];
        ingredients: SOPIngredient[];
        behaviors: SOPBehavior[];
      };
    })
  );

  const validSops = sopDetails.filter((s): s is NonNullable<typeof s> => s !== null);

  // 3. Generate questions for each SOP in batches
  const BATCH_SIZE = 5;
  const allGeneratedQuestions: {
    sopId: string;
    steps: SOPStep[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questions: any[];
  }[] = [];

  // Group SOPs into chunks of BATCH_SIZE
  for (let i = 0; i < validSops.length; i += BATCH_SIZE) {
    const chunk = validSops.slice(i, i + BATCH_SIZE);
    
    // Each call to callClaudeBatch now contains multiple SOPs
    const { prompt, outputFormat } = buildPresetQuizBatchPrompt({ sops: chunk });
    const response = await callClaude(prompt, outputFormat);
    
    // Map responses back to SOP ID
    for (const sopQuiz of response.sop_quizzes) {
      const sop = chunk.find((s) => s.id === sopQuiz.sop_id);
      if (sop) {
        allGeneratedQuestions.push({
          sopId: sop.id,
          steps: sop.steps,
          questions: sopQuiz.questions,
        });
      }
    }
  }

  // 4. Clear existing questions for this preset
  await supabase.from("sop_preset_questions").delete().eq("preset_id", presetId);

  // 5. Insert new questions
  const questionsToInsert = allGeneratedQuestions.flatMap((item) => {
    const stepNumberToId = new Map<number, string>();
    item.steps.forEach((s) => stepNumberToId.set(s.step_number, s.id));

    return item.questions.map((q, idx) => ({
      preset_id: presetId,
      sop_id: item.sopId,
      question_number: idx + 1, // Reset numbering per preset or keep it simple
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      related_step_id: q.related_step_number ? stepNumberToId.get(q.related_step_number) || null : null,
    }));
  });

  if (questionsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("sop_preset_questions")
      .insert(questionsToInsert);

    if (insertError) {
      throw new Error(`Failed to insert preset questions: ${insertError.message}`);
    }
  }

  return { success: true, count: questionsToInsert.length };
}
