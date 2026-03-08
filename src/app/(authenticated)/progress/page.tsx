"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import ProgressBar from "@/components/sop/ProgressBar";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";

interface SOPProgress {
  sop_id: string;
  sop_title: string;
  sop_emoji: string;
  category_name: string;
  total_steps: number;
  completed_steps: number;
}

const ProgressPage = () => {
  const { user, supabase, loading: authLoading } = useAuth();
  const [sopProgress, setSopProgress] = useState<SOPProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        const [{ data: sops }, { data: progress }] = await Promise.all([
          supabase
            .from("sops")
            .select("id, title, category:categories(name, emoji), sop_steps(id)")
            .eq("status", "published"),
          supabase
            .from("staff_progress")
            .select("sop_id, step_id, completed")
            .eq("user_id", user.id)
            .eq("completed", true),
        ]);

        if (!sops) {
          setSopProgress([]);
          return;
        }

        const progressMap = new Map<string, Set<string>>();
        (progress || []).forEach((p) => {
          if (!progressMap.has(p.sop_id)) progressMap.set(p.sop_id, new Set());
          progressMap.get(p.sop_id)!.add(p.step_id);
        });

        const result: SOPProgress[] = sops.map((sop) => {
          const cat = sop.category as unknown as { name: string; emoji: string } | null;
          const steps = sop.sop_steps as unknown as { id: string }[] | null;
          return {
            sop_id: sop.id,
            sop_title: sop.title,
            sop_emoji: cat?.emoji || "📋",
            category_name: cat?.name || "Uncategorized",
            total_steps: steps?.length || 0,
            completed_steps: progressMap.get(sop.id)?.size || 0,
          };
        });

        result.sort((a, b) => {
          const aPercent = a.total_steps > 0 ? a.completed_steps / a.total_steps : 0;
          const bPercent = b.total_steps > 0 ? b.completed_steps / b.total_steps : 0;
          if (aPercent > 0 && aPercent < 1 && (bPercent === 0 || bPercent === 1)) return -1;
          if (bPercent > 0 && bPercent < 1 && (aPercent === 0 || aPercent === 1)) return 1;
          return bPercent - aPercent;
        });

        setSopProgress(result);
      } catch (err) {
        console.error("Fetch progress error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user, supabase, authLoading]);

  const totalCompleted = sopProgress.filter(
    (s) => s.total_steps > 0 && s.completed_steps === s.total_steps
  ).length;
  const inProgress = sopProgress.filter(
    (s) => s.completed_steps > 0 && s.completed_steps < s.total_steps
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Progress 📊</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track your progress across all SOPs
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{totalCompleted}</p>
          <p className="text-xs text-green-600 font-medium">Completed</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{inProgress}</p>
          <p className="text-xs text-amber-600 font-medium">In Progress</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">
            {sopProgress.filter((s) => s.completed_steps === 0).length}
          </p>
          <p className="text-xs text-gray-500 font-medium">Not Started</p>
        </div>
      </div>

      {/* SOP list */}
      <div className="space-y-3">
        {sopProgress.map((sop) => {
          const isComplete =
            sop.total_steps > 0 && sop.completed_steps === sop.total_steps;
          return (
            <Link key={sop.sop_id} href={`/sops/${sop.sop_id}`}>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-amber-200 transition-all flex items-center gap-4">
                <span className="text-2xl">{sop.sop_emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate text-sm">
                      {sop.sop_title}
                    </h3>
                    {isComplete && <span className="text-xs">✅</span>}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    {sop.category_name}
                  </p>
                  {sop.total_steps > 0 && (
                    <ProgressBar
                      completed={sop.completed_steps}
                      total={sop.total_steps}
                    />
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </div>
            </Link>
          );
        })}

        {sopProgress.length === 0 && (
          <div className="text-center py-16">
            <span className="text-5xl block mb-4">📋</span>
            <p className="text-gray-500 font-medium">No SOPs available yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Check back later for new procedures
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressPage;
