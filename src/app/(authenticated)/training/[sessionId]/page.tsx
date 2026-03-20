"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import ReviewSection from "@/components/training/ReviewSection";
import QuizSection from "@/components/training/QuizSection";
import ResultsSection from "@/components/training/ResultsSection";
import type { TrainingSession, TrainingQuestion, TrainingAnswer } from "@/lib/types";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Phase = "review" | "quiz" | "results";

const TrainingSessionPage = () => {
  const params = useParams();
  const router = useRouter();
  const { supabase, user, loading: authLoading } = useAuth();

  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<TrainingSession | null>(null);
  const [questions, setQuestions] = useState<TrainingQuestion[]>([]);
  const [answers, setAnswers] = useState<TrainingAnswer[]>([]);
  const [phase, setPhase] = useState<Phase>("review");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchSession = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from("training_sessions")
          .select("*, sop:sops(id, title, description, category:categories(name, emoji))")
          .eq("id", sessionId)
          .single();

        if (sessionError || !sessionData) {
          setError("Training session not found");
          return;
        }

        setSession(sessionData);

        const { data: questionsData } = await supabase
          .from("training_questions")
          .select("*")
          .eq("session_id", sessionId)
          .order("question_number");

        setQuestions(questionsData || []);

        // Check if there are existing answers (resuming)
        const { data: existingAnswers } = await supabase
          .from("training_answers")
          .select("*")
          .eq("user_id", user.id)
          .in(
            "question_id",
            (questionsData || []).map((q) => q.id)
          );

        if (existingAnswers && existingAnswers.length > 0) {
          setAnswers(existingAnswers);
        }

        if (sessionData.status === "completed") {
          setPhase("results");
          if (existingAnswers) setAnswers(existingAnswers);
        } else if (sessionData.status === "in_progress") {
          // If they've answered all questions, show results
          if (
            existingAnswers &&
            questionsData &&
            existingAnswers.length >= questionsData.length
          ) {
            setPhase("results");
          } else if (existingAnswers && existingAnswers.length > 0) {
            setPhase("quiz");
          }
        }

        // Mark as in_progress if pending
        if (sessionData.status === "pending") {
          await supabase
            .from("training_sessions")
            .update({
              status: "in_progress",
              started_at: new Date().toISOString(),
            })
            .eq("id", sessionId);
        }
      } catch (err) {
        setError("Failed to load training session");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [authLoading, user, supabase, sessionId]);

  const handleQuizComplete = useCallback(
    async (correctCount: number) => {
      if (!session || !user) return;

      const totalQuestions = questions.length;
      const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      const passMark = session.preset_id ? 80 : 70;
      const passed = score >= passMark;

      // Update session status
      await supabase
        .from("training_sessions")
        .update({
          status: "completed",
          score,
          correct_answers: correctCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      // If it's a preset quiz and they failed, reset their progress
      if (session.preset_id && !passed) {
        try {
          const { data: { session: authSession } } = await supabase.auth.getSession();
          
          await fetch(`/api/presets/${session.preset_id}/reset-progress`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authSession?.access_token}`,
            },
          });
        } catch (err) {
          console.error("Failed to reset preset progress:", err);
        }
      }

      // Notify admins
      try {
        await fetch("/api/notifications/training-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sopTitle: session.sop?.title,
            presetId: session.preset_id,
            passed,
          }),
        });
      } catch (notifyErr) {
        console.error("Failed to trigger completion notification:", notifyErr);
      }

      // Reload answers for results display
      const { data: allAnswers } = await supabase
        .from("training_answers")
        .select("*")
        .eq("user_id", user.id)
        .in(
          "question_id",
          questions.map((q) => q.id)
        );

      setAnswers(allAnswers || []);
      setSession((prev) =>
        prev
          ? { ...prev, status: "completed", score, correct_answers: correctCount }
          : prev
      );
      setPhase("results");
    },
    [session, user, questions, supabase, sessionId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-24">
        <p className="text-gray-500 mb-4">{error || "Session not found"}</p>
        <Link
          href="/dashboard"
          className="text-amber-600 font-medium text-sm hover:text-amber-700"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {phase === "review" && "Review Material"}
            {phase === "quiz" && "Quiz Time"}
            {phase === "results" && "Training Complete"}
          </h1>
          <p className="text-sm text-gray-500">
            {session.sop?.title || "Training Session"}
          </p>
        </div>
      </div>

      {/* Phase content */}
      {phase === "review" && (
        <ReviewSection
          sopTitle={session.sop?.title || ""}
          reviewContent={session.review_content}
          onReady={() => setPhase("quiz")}
        />
      )}

      {phase === "quiz" && (
        <QuizSection
          sessionId={session.id}
          questions={questions}
          onComplete={handleQuizComplete}
        />
      )}

      {phase === "results" && (
        <ResultsSection
          sopId={session.sop_id}
          sopTitle={session.sop?.title || ""}
          totalQuestions={session.total_questions}
          correctAnswers={session.correct_answers}
          questions={questions}
          answers={answers}
          presetId={session.preset_id}
        />
      )}
    </div>
  );
};

export default TrainingSessionPage;
