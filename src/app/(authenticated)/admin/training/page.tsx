"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  TrendingUp,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { Profile } from "@/lib/types";

interface StaffTrainingOverview {
  profile: Profile;
  totalSessions: number;
  completedSessions: number;
  averageScore: number | null;
  lastScore: number | null;
  currentStatus: "pending" | "in_progress" | "completed" | "none";
  lastTrainedAt: string | null;
}

const AdminTrainingPage = () => {
  const { supabase, loading: authLoading } = useAuth();
  const [staffOverviews, setStaffOverviews] = useState<StaffTrainingOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    fetchOverviews();
  }, [authLoading]);

  const fetchOverviews = async () => {
    setLoading(true);
    try {
      const { data: staffMembers } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "staff")
        .order("full_name");

      if (!staffMembers) {
        setStaffOverviews([]);
        return;
      }

      const overviews: StaffTrainingOverview[] = [];

      for (const staff of staffMembers) {
        const { data: sessions } = await supabase
          .from("training_sessions")
          .select("status, score, completed_at")
          .eq("user_id", staff.id)
          .order("generated_at", { ascending: false });

        const completed = sessions?.filter((s) => s.status === "completed") || [];
        const scores = completed
          .map((s) => s.score)
          .filter((s): s is number => s !== null);

        const activeSession = sessions?.find(
          (s) => s.status === "pending" || s.status === "in_progress"
        );

        overviews.push({
          profile: staff,
          totalSessions: sessions?.length || 0,
          completedSessions: completed.length,
          averageScore:
            scores.length > 0
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : null,
          lastScore: scores.length > 0 ? scores[0] : null,
          currentStatus: activeSession?.status || (completed.length > 0 ? "completed" : "none"),
          lastTrainedAt: completed[0]?.completed_at || null,
        });
      }

      setStaffOverviews(overviews);
    } catch (err) {
      console.error("Failed to fetch training overviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const triggerBatchGeneration = async () => {
    setGenerating(true);
    setGenMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/generate-training", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (res.ok) {
        setGenMessage(
          `Generated ${data.generated} training session${data.generated !== 1 ? "s" : ""} out of ${data.total} staff members.`
        );
        fetchOverviews();
      } else {
        setGenMessage(`Error: ${data.error}`);
      }
    } catch {
      setGenMessage("Failed to trigger generation.");
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
            Pending
          </span>
        );
      case "in_progress":
        return (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
            In Progress
          </span>
        );
      case "completed":
        return (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
            Up to Date
          </span>
        );
      default:
        return (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
            No Training
          </span>
        );
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-400";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Training</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and manage training sessions for your team
          </p>
        </div>
        <button
          onClick={triggerBatchGeneration}
          disabled={generating}
          className="inline-flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generating..." : "Generate All"}
        </button>
      </div>

      {genMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          {genMessage}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <Users className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{staffOverviews.length}</p>
          <p className="text-xs text-gray-500">Total Staff</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <GraduationCap className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {staffOverviews.filter((s) => s.currentStatus === "pending" || s.currentStatus === "in_progress").length}
          </p>
          <p className="text-xs text-gray-500">Active Training</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {staffOverviews.reduce((acc, s) => acc + s.completedSessions, 0)}
          </p>
          <p className="text-xs text-gray-500">Total Completed</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <TrendingUp className="w-5 h-5 text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {(() => {
              const scores = staffOverviews
                .map((s) => s.averageScore)
                .filter((s): s is number => s !== null);
              return scores.length > 0
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) + "%"
                : "--";
            })()}
          </p>
          <p className="text-xs text-gray-500">Avg Score</p>
        </div>
      </div>

      {/* Staff list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Staff Members</h2>
        </div>

        {staffOverviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No staff members found.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {staffOverviews.map((overview) => (
              <Link
                key={overview.profile.id}
                href={`/admin/training/${overview.profile.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 shrink-0">
                  {overview.profile.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {overview.profile.full_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {overview.completedSessions} sessions completed
                    {overview.lastTrainedAt &&
                      ` · Last: ${new Date(overview.lastTrainedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className={`text-sm font-bold ${getScoreColor(overview.averageScore)}`}>
                      {overview.averageScore !== null ? `${overview.averageScore}%` : "--"}
                    </p>
                    <p className="text-xs text-gray-400">Avg score</p>
                  </div>
                  {getStatusBadge(overview.currentStatus)}
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTrainingPage;
