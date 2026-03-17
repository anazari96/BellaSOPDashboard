import type { SOP, SOPStep, SOPIngredient, SOPBehavior, AdminStaffNote } from "@/lib/types";
import { z, ZodType } from "zod";

interface TrainingContext {
  sop: SOP & {
    steps: SOPStep[];
    ingredients?: SOPIngredient[];
    behaviors?: SOPBehavior[];
  };
  previousWrongStepIds: string[];
  previousScore: number | null;
  timesTrainedOnSop: number;
  adminNotes: AdminStaffNote[];
}

function formatSOPContent(ctx: TrainingContext): string {
  const { sop } = ctx;
  const parts: string[] = [];

  parts.push(`SOP Title: ${sop.title}`);
  parts.push(`Type: ${sop.sop_type || "procedure"}`);
  if (sop.description) parts.push(`Description: ${sop.description}`);

  if (sop.ingredients && sop.ingredients.length > 0) {
    parts.push("\nIngredients:");
    for (const ing of sop.ingredients) {
      parts.push(`- ${ing.name}: ${ing.amount}${ing.unit ? ` ${ing.unit}` : ""}`);
    }
  }

  if (sop.behaviors && sop.behaviors.length > 0) {
    parts.push("\nBehaviors/Greetings:");
    for (const b of sop.behaviors) {
      parts.push(`- Trigger: ${b.trigger_title}\n  Response: ${b.response_content}`);
    }
  }

  parts.push("\nSteps:");
  for (const step of sop.steps) {
    const wrongMarker = ctx.previousWrongStepIds.includes(step.id) ? " [STAFF GOT THIS WRONG BEFORE]" : "";
    parts.push(`\nStep ${step.step_number}: ${step.title}${wrongMarker}`);
    parts.push(step.content);
    if (step.tip) parts.push(`Tip: ${step.tip}`);
    if (step.warning) parts.push(`Warning: ${step.warning}`);
  }

  return parts.join("\n");
}

function formatStaffContext(ctx: TrainingContext): string {
  const lines: string[] = [];

  lines.push(`Times trained on this SOP: ${ctx.timesTrainedOnSop}`);
  if (ctx.previousScore !== null) {
    lines.push(`Last score: ${ctx.previousScore}%`);
  }
  if (ctx.previousWrongStepIds.length > 0) {
    lines.push(`Number of steps they previously got wrong: ${ctx.previousWrongStepIds.length}`);
  }

  if (ctx.adminNotes.length > 0) {
    lines.push("\nAdmin notes about this staff member's issues:");
    for (const note of ctx.adminNotes) {
      lines.push(`- [${note.priority.toUpperCase()}] ${note.note}`);
    }
  }

  return lines.join("\n");
}

export function buildGenerationPrompt(ctx: TrainingContext): {
  prompt: string;
  outputFormat: ZodType;
} {
  const sopContent = formatSOPContent(ctx);
  const staffContext = formatStaffContext(ctx);

  const prompt = `You are a training content generator for a cafe/restaurant staff training platform.

Your task is to create a focused 10-minute training session that includes:
1. A condensed REVIEW of the SOP material (about 3 minutes of reading). Use Markdown formatting (bold, lists, headings) to make it easy to scan.
2. 5-7 QUESTIONS to test understanding

IMPORTANT RULES:
- Use Markdown in 'review_content' for better readability (headings, bold, bullet points)
- Questions must be ONLY multiple_choice (4 options) or true_false (2 options: "True" and "False")
- NO free-text or open-ended questions
- Each question must have exactly one correct answer
- Focus extra questions on steps the staff previously got wrong
- If admin notes mention specific problems, address those directly
- The review should be practical and concise, not a copy of the full SOP
- Use simple, clear language appropriate for cafe staff
- For first-time training (times trained = 0), cover the basics broadly
- For repeat training, focus on weak areas and advanced details

<sop_content>
${sopContent}
</sop_content>

<staff_context>
${staffContext}
</staff_context>

Respond with valid JSON in this exact format:
{
  "review_content": "Markdown formatted review material...",
  "questions": [
    {
      "question_number": 1,
      "question_text": "The question...",
      "question_type": "multiple_choice",
      "options": [
        {"label": "A) First option", "value": "a"},
        {"label": "B) Second option", "value": "b"},
        {"label": "C) Third option", "value": "c"},
        {"label": "D) Fourth option", "value": "d"}
      ],
      "correct_answer": "a",
      "explanation": "Brief explanation of why this is correct...",
      "related_step_number": 1
    },
    {
      "question_number": 2,
      "question_text": "True or False: ...",
      "question_type": "true_false",
      "options": [
        {"label": "True", "value": "true"},
        {"label": "False", "value": "false"}
      ],
      "correct_answer": "true",
      "explanation": "Brief explanation...",
      "related_step_number": 2
    }
  ]
}

Return ONLY the JSON object, no markdown code fences or other text.`;

  console.log("prompt", prompt);

  const outputFormat = z.object({
    review_content: z.string(),
    questions: z.array(
      z.object({
        question_number: z.number(),
        question_text: z.string(),
        question_type: z.union([z.literal("multiple_choice"), z.literal("true_false")]),
        options: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
          }),
        ),
        correct_answer: z.string(),
        explanation: z.string(),
        related_step_number: z.number().nullable(),
      }),
    ),
  });

  return { prompt, outputFormat };
}

export function buildPresetQuizBatchPrompt(ctx: {
  sops: (SOP & {
    steps: SOPStep[];
    ingredients?: SOPIngredient[];
    behaviors?: SOPBehavior[];
  })[];
}): {
  prompt: string;
  outputFormat: ZodType;
} {
  const parts: string[] = [];

  for (const sop of ctx.sops) {
    const content = formatSOPContent({
      sop,
      previousWrongStepIds: [],
      previousScore: null,
      timesTrainedOnSop: 0,
      adminNotes: [],
    });

    parts.push(`
        <sop_id>${sop.id}</sop_id>
        <sop_content>
        ${content}
        </sop_content>
    `);
  }

  const prompt = `You are a training content generator for a cafe/restaurant staff training platform.

    Your task is to generate 4 quiz questions for EACH of the following SOPs (Standard Operating Procedures). 

    IMPORTANT RULES:
    - Questions must be ONLY multiple_choice (4 options) or true_false (2 options: "True" and "False")
    - NO free-text or open-ended questions
    - Each question must have exactly one correct answer
    - Use simple, clear language appropriate for cafe staff
    - Focus on the most important safety, quality, or customer service aspects of this SOP.

    ${parts.join("\n")}

    Respond with valid JSON in this exact format:
    {
    "sop_quizzes": [
        {
        "sop_id": "the_id_from_the_sop_id_tag",
        "questions": [
            {
            "question_number": 1,
            "question_text": "The question...",
            "question_type": "multiple_choice",
            "options": [
                {"label": "A) First option", "value": "a"},
                {"label": "B) Second option", "value": "b"},
                {"label": "C) Third option", "value": "c"},
                {"label": "D) Fourth option", "value": "d"}
            ],
            "correct_answer": "a",
            "explanation": "Brief explanation of why this is correct...",
            "related_step_number": 1
            }
        ]
        }
    ]
    }

    Return ONLY the JSON object, no markdown code fences or other text.`;

  const outputFormat = z.object({
    sop_quizzes: z.array(
      z.object({
        sop_id: z.string(),
        questions: z.array(
          z.object({
            question_number: z.number(),
            question_text: z.string(),
            question_type: z.union([z.literal("multiple_choice"), z.literal("true_false")]),
            options: z.array(
              z.object({
                label: z.string(),
                value: z.string(),
              }),
            ),
            correct_answer: z.string(),
            explanation: z.string(),
            related_step_number: z.number().nullable(),
          }),
        ),
      }),
    ),
  });

  return { prompt, outputFormat };
}

export interface GeneratedQuestion {
  question_number: number;
  question_text: string;
  question_type: "multiple_choice" | "true_false";
  options: { label: string; value: string }[];
  correct_answer: string;
  explanation: string;
  related_step_number: number | null;
}

export interface GeneratedTrainingContent {
  review_content: string;
  questions: GeneratedQuestion[];
}
