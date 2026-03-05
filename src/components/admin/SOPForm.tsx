"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import StepEditor, { type StepData } from "./StepEditor";
import type { Category, SOPImportance, SOPStatus } from "@/lib/types";
import { Loader2, Save, Eye } from "lucide-react";

interface SOPFormProps {
  sopId?: string;
}

const SOPForm = ({ sopId }: SOPFormProps) => {
  const router = useRouter();
  const { user, supabase, loading: authLoading } = useAuth();
  const isEditing = Boolean(sopId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [importance, setImportance] = useState<SOPImportance>("medium");
  const [status, setStatus] = useState<SOPStatus>("draft");
  const [categories, setCategories] = useState<Category[]>([]);
  const [steps, setSteps] = useState<StepData[]>([
    { id: "temp-1", title: "", content: "", tip: "", warning: "", media: [] },
  ]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<"info" | "steps">("info");

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      try {
        const { data: cats } = await supabase
          .from("categories")
          .select("*")
          .order("sort_order");
        setCategories(cats || []);

        if (cats && cats.length > 0 && !categoryId) {
          setCategoryId(cats[0].id);
        }

        if (sopId) {
          const [sopRes, stepsRes] = await Promise.all([
            supabase.from("sops").select("*").eq("id", sopId).single(),
            supabase
              .from("sop_steps")
              .select("*, media:step_media(*)")
              .eq("sop_id", sopId)
              .order("step_number"),
          ]);

          if (sopRes.data) {
            setTitle(sopRes.data.title);
            setDescription(sopRes.data.description || "");
            setCategoryId(sopRes.data.category_id);
            setImportance(sopRes.data.importance);
            setStatus(sopRes.data.status);
          }

          if (stepsRes.data && stepsRes.data.length > 0) {
            setSteps(
              stepsRes.data.map((s) => ({
                id: s.id,
                title: s.title,
                content: s.content,
                tip: s.tip || "",
                warning: s.warning || "",
                media: (s.media || []).map((m: { id: string; media_url: string; media_type: "image" | "video"; caption: string | null }) => ({
                  id: m.id,
                  media_url: m.media_url,
                  media_type: m.media_type,
                  caption: m.caption || "",
                })),
              }))
            );
          }
        }
      } catch (err) {
        console.error("SOPForm fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sopId, authLoading, supabase]);

  const handleSave = async (publishNow?: boolean) => {
    if (!title.trim() || !categoryId) return;
    setSaving(true);

    const sopData = {
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      importance,
      status: publishNow ? "published" as SOPStatus : status,
      created_by: user?.id,
    };

    let savedSopId = sopId;

    if (isEditing && sopId) {
      await supabase.from("sops").update(sopData).eq("id", sopId);
    } else {
      const { data } = await supabase.from("sops").insert(sopData).select("id").single();
      savedSopId = data?.id;
    }

    if (!savedSopId) {
      setSaving(false);
      return;
    }

    if (isEditing) {
      const { data: existingSteps } = await supabase
        .from("sop_steps")
        .select("id")
        .eq("sop_id", savedSopId);

      if (existingSteps) {
        for (const s of existingSteps) {
          await supabase.from("step_media").delete().eq("step_id", s.id);
        }
        await supabase.from("sop_steps").delete().eq("sop_id", savedSopId);
      }
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step.title.trim() && !step.content.trim()) continue;

      const { data: stepData } = await supabase
        .from("sop_steps")
        .insert({
          sop_id: savedSopId,
          step_number: i + 1,
          title: step.title.trim() || `Step ${i + 1}`,
          content: step.content.trim(),
          tip: step.tip.trim() || null,
          warning: step.warning.trim() || null,
        })
        .select("id")
        .single();

      if (stepData && step.media.length > 0) {
        const mediaInserts = step.media.map((m, j) => ({
          step_id: stepData.id,
          media_url: m.media_url,
          media_type: m.media_type,
          caption: m.caption || null,
          sort_order: j,
        }));
        await supabase.from("step_media").insert(mediaInserts);
      }
    }

    setSaving(false);
    router.push("/admin/sops");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setCurrentTab("info")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            currentTab === "info"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📝 Basic Info
        </button>
        <button
          onClick={() => setCurrentTab("steps")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            currentTab === "steps"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📋 Steps ({steps.length})
        </button>
      </div>

      {currentTab === "info" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              SOP Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Espresso Machine Startup"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this SOP..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm resize-none text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2 text-center ${
                    categoryId === cat.id
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg block mb-0.5">{cat.emoji}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Importance
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { value: "critical", label: "Critical", emoji: "🔴" },
                  { value: "high", label: "High", emoji: "🟠" },
                  { value: "medium", label: "Medium", emoji: "🟡" },
                  { value: "low", label: "Low", emoji: "🟢" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setImportance(opt.value)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2 text-center ${
                    importance === opt.value
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="block mb-0.5">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setCurrentTab("steps")}
            className="w-full bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 transition-colors"
          >
            Next: Add Steps →
          </button>
        </div>
      )}

      {currentTab === "steps" && (
        <div className="space-y-4">
          <StepEditor steps={steps} onChange={setSteps} />

          <div className="flex items-center gap-3 pt-4 border-t border-gray-100 mt-6">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !title.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 py-3 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save as Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !title.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Save & Publish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SOPForm;
