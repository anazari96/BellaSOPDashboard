"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Lightbulb,
  AlertTriangle,
  PartyPopper,
  ExternalLink,
  Rows3,
  GalleryVertical,
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

  const wasAlreadyCompleted =
    steps.length > 0 &&
    steps.every((step) =>
      initialProgress.some((p) => p.step_id === step.id && p.completed)
    );

  const [viewMode, setViewMode] = useState<"steps" | "overview">(
    wasAlreadyCompleted ? "overview" : "steps"
  );
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

  const ViewToggle = () => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
      <button
        onClick={() => setViewMode("steps")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          viewMode === "steps"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <GalleryVertical className="w-3.5 h-3.5" />
        Step by Step
      </button>
      <button
        onClick={() => setViewMode("overview")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          viewMode === "overview"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <Rows3 className="w-3.5 h-3.5" />
        All Steps
      </button>
    </div>
  );

  /* ─────────────────── OVERVIEW MODE ─────────────────── */
  if (viewMode === "overview") {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">
              {completedCount}/{steps.length} completed
            </span>
            {allComplete && (
              <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                All done ✓
              </span>
            )}
          </div>
          <ViewToggle />
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => {
            const isDone = !!progress[step.id];
            const hasMedia = step.media && step.media.length > 0;

            return (
              <div
                key={step.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                  isDone ? "border-green-200" : "border-gray-100"
                }`}
              >
                {/* Step header */}
                <div
                  className={`flex items-center gap-3 px-5 py-3.5 border-b ${
                    isDone
                      ? "bg-green-50 border-green-100"
                      : "bg-linear-to-r from-amber-50 to-orange-50 border-gray-100"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      isDone
                        ? "bg-green-500 text-white"
                        : "bg-amber-600 text-white"
                    }`}
                  >
                    {isDone ? "✓" : idx + 1}
                  </span>
                  <h3
                    className={`font-semibold text-sm flex-1 ${
                      isDone ? "text-green-900" : "text-gray-900"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <button
                    onClick={() => toggleStep(step.id)}
                    className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                      isDone
                        ? "bg-white border-green-200 text-green-700 hover:bg-green-50"
                        : "bg-amber-600 border-amber-600 text-white hover:bg-amber-700"
                    }`}
                  >
                    {isDone ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Done
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5" />
                        Mark done
                      </>
                    )}
                  </button>
                </div>

                {/* Step body: text left, media right */}
                <div
                  className={`p-5 ${hasMedia ? "flex gap-5" : ""}`}
                >
                  {/* Left: content + tips + warnings + linked SOP */}
                  <div className={hasMedia ? "flex-1 min-w-0" : ""}>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {step.content}
                    </p>

                    {step.tip && (
                      <div className="mt-3 flex gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <Lightbulb className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-800 mb-0.5">
                            💡 Pro Tip
                          </p>
                          <p className="text-xs text-blue-700">{step.tip}</p>
                        </div>
                      </div>
                    )}

                    {step.warning && (
                      <div className="mt-3 flex gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-red-800 mb-0.5">
                            ⚠️ Important
                          </p>
                          <p className="text-xs text-red-700">{step.warning}</p>
                        </div>
                      </div>
                    )}

                    {step.linked_sop_id && step.linked_sop && (
                      <Link
                        href={`/sops/${step.linked_sop.id}`}
                        className="mt-3 flex items-center gap-2.5 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
                      >
                        <span className="text-lg">
                          {step.linked_sop.category?.emoji || "📋"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-amber-700 mb-0.5">
                            Related SOP
                          </p>
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {step.linked_sop.title}
                          </p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      </Link>
                    )}
                  </div>

                  {/* Right: media */}
                  {hasMedia && (
                    <div className="w-44 md:w-56 shrink-0">
                      <StepMedia media={step.media!} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {allComplete && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-base font-bold text-green-800 mb-1">All Done!</h3>
            <p className="text-sm text-green-700">
              You&apos;ve completed all {steps.length} steps.
            </p>
          </div>
        )}
      </div>
    );
  }

  /* ─────────────────── STEP-BY-STEP MODE ─────────────────── */

  if (allComplete) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end mb-4">
          <ViewToggle />
        </div>
        <div className="text-center py-12 px-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">All Done!</h2>
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
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top row: progress bar + toggle */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <ProgressBar completed={completedCount} total={steps.length} />
        </div>
        <ViewToggle />
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto scrollbar-hide px-1 py-1">
        {steps.map((step, i) => (
          <button
            key={step.id}
            onClick={() => goToStep(i)}
            className={`shrink-0 w-8 h-8 rounded-full text-xs font-bold transition-all ${
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
          <div className="bg-linear-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-100">
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
                <Lightbulb className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
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
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 mb-0.5">
                    ⚠️ Important
                  </p>
                  <p className="text-sm text-red-700">{currentStep.warning}</p>
                </div>
              </div>
            )}

            {currentStep.linked_sop_id && currentStep.linked_sop && (
              <Link
                href={`/sops/${currentStep.linked_sop.id}`}
                className="mt-4 flex items-center gap-3 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <span className="text-2xl">
                  {currentStep.linked_sop.category?.emoji || "📋"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-amber-700 mb-0.5">
                    Related SOP
                  </p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {currentStep.linked_sop.title}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-amber-600 shrink-0" />
              </Link>
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
