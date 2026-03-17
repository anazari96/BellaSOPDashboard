"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import TrainingCard from "@/components/training/TrainingCard";
import Link from "next/link";
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Loader2,
  Trophy,
} from "lucide-react";
import type { TrainingSession } from "@/lib/types";

const TrainingPage = () => {
  const { supabase, user, loading: authLoading } = useAuth();
  const [activeSession, setActiveSession] = useState<TrainingSession | null>(null);
  const [history, setHistory] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchTraining = async () => {
      try {
        const [activeRes, historyRes] = await Promise.all([
          supabase
            .from("training_sessions")
            .select("*, sop:sops(id, title, category:categories(name, emoji))")
            .in("status", ["pending", "in_progress"])
            .order("generated_at", { ascending: false })
            .limit(1),
          supabase
            .from("training_sessions")
            .select("*, sop:sops(id, title, category:categories(name, emoji))")
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(20),
        ]);

        setActiveSession(activeRes.data?.[0] || null);
        setHistory(historyRes.data || []);
      } catch (err) {
        console.error("Failed to fetch training:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTraining();
  }, [authLoading, user, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Training</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete your daily training sessions to stay sharp
        </p>
      </div>

      {/* Active session */}
      {activeSession ? (
        <TrainingCard session={activeSession} />
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">All caught up!</p>
            <p className="text-sm text-green-600">
              No pending training sessions. Your next session will be generated
              automatically.
            </p>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Past Sessions</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {history.map((session) => {
              const scoreColor =
                session.score !== null && session.score >= 80
                  ? "text-green-600"
                  : session.score !== null && session.score >= 60
                  ? "text-amber-600"
                  : "text-red-600";

              return (
                <Link
                  key={session.id}
                  href={`/training/${session.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.sop?.title || "Training Session"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.completed_at
                        ? new Date(session.completed_at).toLocaleDateString()
                        : ""}
                      {" · "}
                      {session.correct_answers}/{session.total_questions} correct
                    </p>
                  </div>
                  {session.score !== null && (
                    <span className={`text-lg font-bold ${scoreColor}`}>
                      {session.score}%
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {history.length === 0 && !activeSession && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            No training sessions yet. Your first one will be generated soon!
          </p>
        </div>
      )}
    </div>
  );
};

export default TrainingPage;
