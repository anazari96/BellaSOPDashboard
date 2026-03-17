"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, XCircle, ArrowRight, HelpCircle } from "lucide-react";
import type { TrainingQuestion, QuestionOption } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";

interface QuizSectionProps {
  sessionId: string;
  questions: TrainingQuestion[];
  onComplete: (correctCount: number) => void;
}

const QuizSection = ({ sessionId, questions, onComplete }: QuizSectionProps) => {
  const { supabase, user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [animating, setAnimating] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedOption === currentQuestion.correct_answer;
  const isLast = currentIndex === questions.length - 1;

  const handleSelect = useCallback(
    async (value: string) => {
      if (isAnswered) return;

      setSelectedOption(value);
      setIsAnswered(true);

      const correct = value === currentQuestion.correct_answer;
      if (correct) setCorrectCount((c) => c + 1);

      if (user) {
        await supabase.from("training_answers").upsert(
          {
            question_id: currentQuestion.id,
            user_id: user.id,
            selected_option: value,
            is_correct: correct,
            answered_at: new Date().toISOString(),
          },
          { onConflict: "question_id,user_id" }
        );
      }
    },
    [isAnswered, currentQuestion, supabase, user]
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      const finalCorrect = correctCount + (isCorrect ? 0 : 0);
      onComplete(correctCount);
      return;
    }

    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setAnimating(false);
    }, 200);
  }, [isLast, correctCount, isCorrect, onComplete]);

  const getOptionStyle = (option: QuestionOption) => {
    if (!isAnswered) {
      return "bg-white border-gray-200 hover:border-amber-300 hover:bg-amber-50 cursor-pointer";
    }

    if (option.value === currentQuestion.correct_answer) {
      return "bg-green-50 border-green-300 text-green-800";
    }

    if (option.value === selectedOption && !isCorrect) {
      return "bg-red-50 border-red-300 text-red-800";
    }

    return "bg-gray-50 border-gray-200 text-gray-400";
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span>
              {correctCount} correct so far
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-amber-600 rounded-full h-2 transition-all duration-300"
              style={{
                width: `${((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div
        className={`transition-opacity duration-200 ${
          animating ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {currentQuestion.question_type === "true_false"
                  ? "True or False"
                  : "Multiple Choice"}
              </span>
              <h3 className="text-base font-semibold text-gray-900 mt-1">
                {currentQuestion.question_text}
              </h3>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                disabled={isAnswered}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-3 ${getOptionStyle(
                  option
                )}`}
              >
                {isAnswered && option.value === currentQuestion.correct_answer && (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                )}
                {isAnswered &&
                  option.value === selectedOption &&
                  !isCorrect &&
                  option.value !== currentQuestion.correct_answer && (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                <span className="flex-1">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Explanation (shown after answering) */}
        {isAnswered && (
          <div
            className={`rounded-2xl border p-5 mb-4 ${
              isCorrect
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span
                className={`font-semibold text-sm ${
                  isCorrect ? "text-green-700" : "text-red-700"
                }`}
              >
                {isCorrect ? "Correct!" : "Not quite right"}
              </span>
            </div>
            <p
              className={`text-sm ${
                isCorrect ? "text-green-700" : "text-red-700"
              }`}
            >
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        {/* Next button */}
        {isAnswered && (
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-amber-700 transition-colors"
          >
            {isLast ? "See Results" : "Next Question"}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizSection;
