"use client";

import Link from "next/link";
import { Trophy, Target, ArrowRight, RotateCcw, BookOpen } from "lucide-react";
import type { TrainingQuestion, TrainingAnswer } from "@/lib/types";

interface ResultsSectionProps {
  sopId: string;
  sopTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  questions: TrainingQuestion[];
  answers: TrainingAnswer[];
  presetId?: string;
  onResetProgress?: () => Promise<void>;
}

const ResultsSection = ({
  sopId,
  sopTitle,
  totalQuestions,
  correctAnswers,
  questions,
  answers,
  presetId,
  onResetProgress,
}: ResultsSectionProps) => {
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const passMark = presetId ? 80 : 70;
  const passed = score >= passMark;

  const answerMap = new Map(answers.map((a) => [a.question_id, a]));

  return (
    <div className="max-w-2xl mx-auto">
      {/* Score card */}
      <div
        className={`rounded-2xl border-2 p-8 text-center mb-6 ${
          passed
            ? "bg-green-50 border-green-200"
            : "bg-orange-50 border-orange-200"
        }`}
      >
        <div className="mb-4">
          {passed ? (
            <Trophy className="w-16 h-16 text-green-500 mx-auto" />
          ) : (
            <Target className="w-16 h-16 text-orange-500 mx-auto" />
          )}
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-1">{score}%</h2>
        <p
          className={`text-sm font-medium ${
            passed ? "text-green-700" : "text-orange-700"
          }`}
        >
          {passed ? "Great job!" : presetId ? "You didn't pass. Re-read the preset and try again." : "Keep practicing!"}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {correctAnswers} out of {totalQuestions} correct {presetId && `(80% required to pass)`}
        </p>
      </div>

      {/* Question breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Question Breakdown</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {questions.map((q) => {
            const answer = answerMap.get(q.id);
            const isCorrect = answer?.is_correct ?? false;

            return (
              <div key={q.id} className="px-5 py-3 flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                    isCorrect
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {isCorrect ? "\u2713" : "\u2717"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 font-medium">
                    {q.question_text}
                  </p>
                  {!isCorrect && (
                    <p className="text-xs text-gray-500 mt-1">
                      Correct answer:{" "}
                      {q.options.find((o) => o.value === q.correct_answer)
                        ?.label || q.correct_answer}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {presetId ? (
          <Link
            href={`/presets/${presetId}`}
            className="flex items-center justify-center gap-2 w-full bg-amber-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors"
          >
            {passed ? "Back to Preset" : "Return to Preset and Re-read"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <>
            <Link
              href={`/sops/${sopId}`}
              className="flex items-center justify-center gap-2 w-full bg-white text-gray-700 py-3 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Review Full SOP: {sopTitle}
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full bg-amber-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-amber-700 transition-colors"
            >
              Back to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default ResultsSection;
