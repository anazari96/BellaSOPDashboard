"use client";

import { useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Lightbulb,
  AlertTriangle,
  PartyPopper,
} from "lucide-react";
import StepMedia from "./StepMedia";
import ProgressBar from "./ProgressBar";
import type { SOPStep, StaffProgress } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";

interface StepViewerProps {
  sopId: string;
  steps: SOPStep[];
  initialProgress: StaffProgress[];
  userId: string;
}

const StepViewer = ({ sopId, steps, initialProgress, userId }: StepViewerProps) => {
  const { supabase } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    initialProgress.forEach((p) => {
      if (p.completed) map[p.step_id] = true;
    });
    return map;
  });
  const [animating, setAnimating] = useState(false);
  const currentStep = steps[currentIndex];
  const completedCount = Object.values(progress).filter(Boolean).length;
  const allComplete = completedCount === steps.length;

  const toggleStep = useCallback(
    async (stepId: string) => {
      const isCompleted = !progress[stepId];
      setProgress((prev) => ({ ...prev, [stepId]: isCompleted }));

      await supabase.from("staff_progress").upsert(
        {
          user_id: userId,
          sop_id: sopId,
          step_id: stepId,
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,sop_id,step_id" }
      );
    },
    [progress, supabase, userId, sopId]
  );

  const goToStep = (index: number) => {
    if (index < 0 || index >= steps.length) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setAnimating(false);
    }, 150);
  };

  if (allComplete) {
    return (
      <div className="text-center py-12 px-6">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          All Done!
        </h2>
        <p className="text-gray-500 mb-6">
          You&apos;ve completed all {steps.length} steps. Great work!
        </p>
        <div className="flex items-center justify-center gap-2 text-amber-600">
          <PartyPopper className="w-5 h-5" />
          <span className="font-medium">SOP Complete</span>
        </div>
        <button
          onClick={() => {
            setProgress({});
            setCurrentIndex(0);
          }}
          className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Reset and start over
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <ProgressBar completed={completedCount} total={steps.length} />
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto scrollbar-hide px-1 py-1">
        {steps.map((step, i) => (
          <button
            key={step.id}
            onClick={() => goToStep(i)}
            className={`flex-shrink-0 w-8 h-8 rounded-full text-xs font-bold transition-all ${
              i === currentIndex
                ? "bg-amber-600 text-white scale-110 shadow-md"
                : progress[step.id]
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {progress[step.id] ? "✓" : step.step_number}
          </button>
        ))}
      </div>

      {/* Current step */}
      <div
        className={`transition-opacity duration-150 ${
          animating ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-lg">
                {currentStep.step_number}
              </span>
              <div>
                <p className="text-xs text-amber-600 font-medium">
                  Step {currentStep.step_number} of {steps.length}
                </p>
                <h3 className="text-lg font-bold text-gray-900">
                  {currentStep.title}
                </h3>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
              {currentStep.content}
            </div>

            {currentStep.media && currentStep.media.length > 0 && (
              <StepMedia media={currentStep.media} />
            )}

            {currentStep.tip && (
              <div className="mt-4 flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-0.5">
                    💡 Pro Tip
                  </p>
                  <p className="text-sm text-blue-700">{currentStep.tip}</p>
                </div>
              </div>
            )}

            {currentStep.warning && (
              <div className="mt-4 flex gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 mb-0.5">
                    ⚠️ Important
                  </p>
                  <p className="text-sm text-red-700">{currentStep.warning}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => toggleStep(currentStep.id)}
              className={`mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all ${
                progress[currentStep.id]
                  ? "bg-green-50 text-green-700 border-2 border-green-200"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
            >
              {progress[currentStep.id] ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Completed ✓
                </>
              ) : (
                <>
                  <Circle className="w-5 h-5" />
                  Mark as Done
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 gap-3">
          <button
            onClick={() => goToStep(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            onClick={() => goToStep(currentIndex + 1)}
            disabled={currentIndex === steps.length - 1}
            className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepViewer;
