"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import SOPCard from "@/components/sop/SOPCard";
import ImportanceBadge from "@/components/sop/ImportanceBadge";
import type { SOPPreset, SOPPresetItem, StaffProgress } from "@/lib/types";
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Loader2 } from "lucide-react";

const PresetDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, supabase, loading: authLoading } = useAuth();

  const [preset, setPreset] = useState<SOPPreset | null>(null);
  const [items, setItems] = useState<SOPPresetItem[]>([]);
  const [progress, setProgress] = useState<Record<string, StaffProgress[]>>({});
  const [stepCounts, setStepCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    const id = params.id as string;

    const load = async () => {
      try {
        const [presetRes, itemsRes] = await Promise.all([
          supabase
            .from("sop_presets")
            .select("*")
            .eq("id", id)
            .single(),
          supabase
            .from("sop_preset_items")
            .select(
              "*, sop:sops(id, title, description, importance, status, sop_type, updated_at, category:categories(name, emoji))"
            )
            .eq("preset_id", id)
            .order("sort_order"),
        ]);

        if (presetRes.data) setPreset(presetRes.data);
        if (itemsRes.data) {
          setItems(itemsRes.data);

          const sopIds = itemsRes.data.map((item) => item.sop_id);

          // Fetch step counts for each SOP
          const stepCountsPromise = Promise.all(
            sopIds.map((sopId) =>
              supabase
                .from("sop_steps")
                .select("id", { count: "exact", head: true })
                .eq("sop_id", sopId)
                .then(({ count }) => ({ sopId, count: count ?? 0 }))
            )
          );

          // Fetch user progress for each SOP
          const progressPromise = user
            ? supabase
                .from("staff_progress")
                .select("*")
                .eq("user_id", user.id)
                .in("sop_id", sopIds)
            : Promise.resolve({ data: [] });

          const [counts, progressRes] = await Promise.all([
            stepCountsPromise,
            progressPromise,
          ]);

          const countsMap: Record<string, number> = {};
          counts.forEach(({ sopId, count }) => {
            countsMap[sopId] = count;
          });
          setStepCounts(countsMap);

          if (progressRes.data) {
            const progressMap: Record<string, StaffProgress[]> = {};
            progressRes.data.forEach((p) => {
              if (!progressMap[p.sop_id]) progressMap[p.sop_id] = [];
              progressMap[p.sop_id].push(p);
            });
            setProgress(progressMap);
          }
        }
      } catch (err) {
        console.error("Fetch preset error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params.id, user, supabase, authLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!preset) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl block mb-4">😕</span>
        <p className="text-gray-500 font-medium">Preset not found</p>
        <button
          onClick={() => router.push("/presets")}
          className="mt-4 text-amber-600 text-sm font-medium hover:text-amber-700"
        >
          Browse Presets
        </button>
      </div>
    );
  }

  const totalSOPs = items.length;
  const completedSOPs = items.filter((item) => {
    const total = stepCounts[item.sop_id] ?? 0;
    const done = (progress[item.sop_id] ?? []).filter((p) => p.completed).length;
    return total > 0 && done >= total;
  }).length;

  const overallPercent =
    totalSOPs === 0 ? 0 : Math.round((completedSOPs / totalSOPs) * 100);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Preset header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{preset.emoji}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Reading Preset
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                {totalSOPs} SOP{totalSOPs !== 1 ? "s" : ""}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              {preset.title}
            </h1>
            {preset.description && (
              <p className="text-gray-500 text-sm">{preset.description}</p>
            )}

            {/* Overall progress */}
            {totalSOPs > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>
                    {completedSOPs} of {totalSOPs} SOPs completed
                  </span>
                  <span className="font-medium text-amber-700">
                    {overallPercent}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout: sidebar index + SOP grid */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar: ordered list of SOPs */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
              In this preset
            </h2>
            <div className="space-y-1">
              {items.map((item, idx) => {
                const sop = item.sop;
                if (!sop) return null;
                const total = stepCounts[item.sop_id] ?? 0;
                const done = (progress[item.sop_id] ?? []).filter(
                  (p) => p.completed
                ).length;
                const isComplete = total > 0 && done >= total;
                const isActive = activeIndex === idx;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-amber-50 border border-amber-200"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="shrink-0 text-sm font-bold w-5 text-center text-gray-400">
                      {idx + 1}
                    </span>
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                    )}
                    <span
                      className={`text-sm truncate ${
                        isActive
                          ? "font-medium text-amber-900"
                          : "text-gray-700"
                      }`}
                    >
                      {sop.title}
                    </span>
                    {total > 0 && (
                      <span className="ml-auto text-xs text-gray-400 shrink-0">
                        {done}/{total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main area: SOP card + link */}
        <div className="flex-1">
          {items.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <span className="text-5xl block mb-4">📋</span>
              <p className="text-gray-500">No SOPs in this preset yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => {
                const sop = item.sop;
                if (!sop) return null;
                const total = stepCounts[item.sop_id] ?? 0;
                const done = (progress[item.sop_id] ?? []).filter(
                  (p) => p.completed
                ).length;
                const isActive = activeIndex === idx;

                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (isActive && el) {
                        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                      }
                    }}
                    className={`transition-all ${
                      isActive ? "ring-2 ring-amber-400 rounded-2xl" : ""
                    }`}
                    onClick={() => setActiveIndex(idx)}
                  >
                    <div className="relative">
                      {/* Step number badge */}
                      <div className="absolute -left-3 -top-3 z-10 w-7 h-7 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                        {idx + 1}
                      </div>
                      <SOPCard
                        sop={sop}
                        completedSteps={done}
                        totalSteps={total}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Completion banner */}
      {totalSOPs > 0 && completedSOPs === totalSOPs && (
        <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <span className="text-4xl block mb-2">🎉</span>
          <h3 className="text-lg font-bold text-green-800 mb-1">
            Preset Complete!
          </h3>
          <p className="text-green-700 text-sm">
            You&apos;ve read all {totalSOPs} SOPs in &quot;{preset.title}&quot;. Great work!
          </p>
        </div>
      )}
    </div>
  );
};

export default PresetDetailPage;
