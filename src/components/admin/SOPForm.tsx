"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import StepEditor, { type StepData } from "./StepEditor";
import type {
  Category,
  SOPImportance,
  SOPStatus,
  SOPType,
  SOPListItemType,
} from "@/lib/types";
import { Loader2, Save, Eye, Plus, Trash2, GripVertical } from "lucide-react";

interface IngredientRow {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

interface ListItemRow {
  id: string;
  label: string;
}

interface BehaviorRow {
  id: string;
  trigger_title: string;
  response_content: string;
}

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
  const [sopType, setSopType] = useState<SOPType>("procedure");
  const [categories, setCategories] = useState<Category[]>([]);
  const [steps, setSteps] = useState<StepData[]>([
    { id: "temp-1", title: "", content: "", tip: "", warning: "", media: [], linked_sop_id: null },
  ]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [tools, setTools] = useState<ListItemRow[]>([]);
  const [prereqs, setPrereqs] = useState<ListItemRow[]>([]);
  const [behaviors, setBehaviors] = useState<BehaviorRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<"info" | "extras" | "steps">("info");
  const [linkedSopOptions, setLinkedSopOptions] = useState<
    { id: string; title: string; category?: { name: string; emoji: string } }[]
  >([]);

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      try {
        const [catsRes, sopsRes] = await Promise.all([
          supabase.from("categories").select("*").order("sort_order"),
          supabase
            .from("sops")
            .select("id, title, category:categories(name, emoji)")
            .eq("status", "published")
            .order("title"),
        ]);
        const cats = catsRes.data || [];
        setCategories(cats);
        setLinkedSopOptions(
          (sopsRes.data || []).map((s) => ({
            id: s.id,
            title: s.title,
            category: Array.isArray(s.category) ? s.category[0] : s.category ?? undefined,
          }))
        );

        if (cats && cats.length > 0 && !categoryId) {
          setCategoryId(cats[0].id);
        }

        if (sopId) {
          const [sopRes, stepsRes, ingRes, listRes, behRes] = await Promise.all([
            supabase.from("sops").select("*").eq("id", sopId).single(),
            supabase
              .from("sop_steps")
              .select("*, media:step_media(*)")
              .eq("sop_id", sopId)
              .order("step_number"),
            supabase
              .from("sop_ingredients")
              .select("*")
              .eq("sop_id", sopId)
              .order("sort_order"),
            supabase
              .from("sop_list_items")
              .select("*")
              .eq("sop_id", sopId)
              .order("sort_order"),
            supabase
              .from("sop_behaviors")
              .select("*")
              .eq("sop_id", sopId)
              .order("sort_order"),
          ]);

          if (sopRes.data) {
            setTitle(sopRes.data.title);
            setDescription(sopRes.data.description || "");
            setCategoryId(sopRes.data.category_id);
            setImportance(sopRes.data.importance);
            setStatus(sopRes.data.status);
            setSopType((sopRes.data.sop_type as SOPType) || "procedure");
          }

          if (stepsRes.data && stepsRes.data.length > 0) {
            setSteps(
              stepsRes.data.map((s: { id: string; title: string; content: string; tip: string | null; warning: string | null; linked_sop_id: string | null; media?: { id: string; media_url: string; media_type: "image" | "video"; caption: string | null }[] }) => ({
                id: s.id,
                title: s.title,
                content: s.content,
                tip: s.tip || "",
                warning: s.warning || "",
                linked_sop_id: s.linked_sop_id ?? null,
                media: (s.media || []).map((m: { id: string; media_url: string; media_type: "image" | "video"; caption: string | null }) => ({
                  id: m.id,
                  media_url: m.media_url,
                  media_type: m.media_type,
                  caption: m.caption || "",
                })),
              }))
            );
          }

          if (ingRes.data?.length) {
            setIngredients(
              ingRes.data.map((r: { id: string; name: string; amount: string; unit: string | null }) => ({
                id: r.id,
                name: r.name,
                amount: r.amount,
                unit: r.unit || "",
              }))
            );
          }
          if (listRes.data?.length) {
            const toolsList = listRes.data
              .filter((r: { type: string }) => r.type === "tool")
              .map((r: { id: string; label: string }) => ({ id: r.id, label: r.label }));
            const prereqsList = listRes.data
              .filter((r: { type: string }) => r.type === "prereq")
              .map((r: { id: string; label: string }) => ({ id: r.id, label: r.label }));
            if (toolsList.length) setTools(toolsList);
            if (prereqsList.length) setPrereqs(prereqsList);
          }
          if (behRes.data?.length) {
            setBehaviors(
              behRes.data.map((r: { id: string; trigger_title: string; response_content: string }) => ({
                id: r.id,
                trigger_title: r.trigger_title,
                response_content: r.response_content,
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
      status: publishNow ? ("published" as SOPStatus) : status,
      sop_type: sopType,
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

    // Delete old steps (cascade handles step_media automatically)
    if (isEditing) {
      await supabase.from("sop_steps").delete().eq("sop_id", savedSopId);
    }

    // Bulk insert all valid steps in one query
    const validSteps = steps.filter((s) => s.title.trim() || s.content.trim());
    if (validSteps.length > 0) {
      const { data: insertedSteps } = await supabase
        .from("sop_steps")
        .insert(
          validSteps.map((s, i) => ({
            sop_id: savedSopId,
            step_number: i + 1,
            title: s.title.trim() || `Step ${i + 1}`,
            content: s.content.trim(),
            tip: s.tip.trim() || null,
            warning: s.warning.trim() || null,
            linked_sop_id: s.linked_sop_id || null,
          }))
        )
        .select("id, step_number")
        .order("step_number");

      // Bulk insert all media across all steps in one query
      if (insertedSteps) {
        const allMedia: { step_id: string; media_url: string; media_type: string; caption: string | null; sort_order: number }[] = [];
        for (let i = 0; i < insertedSteps.length; i++) {
          const original = validSteps[i];
          if (original?.media?.length > 0) {
            original.media.forEach((m, j) => {
              allMedia.push({
                step_id: insertedSteps[i].id,
                media_url: m.media_url,
                media_type: m.media_type,
                caption: m.caption || null,
                sort_order: j,
              });
            });
          }
        }
        if (allMedia.length > 0) {
          await supabase.from("step_media").insert(allMedia);
        }
      }
    }

    // Clear old type-specific data in parallel
    await Promise.all([
      supabase.from("sop_ingredients").delete().eq("sop_id", savedSopId),
      supabase.from("sop_list_items").delete().eq("sop_id", savedSopId),
      supabase.from("sop_behaviors").delete().eq("sop_id", savedSopId),
    ]);

    // Insert new type-specific data in parallel
    const typeInserts: PromiseLike<unknown>[] = [];

    if (sopType === "recipe" && ingredients.length > 0) {
      typeInserts.push(
        supabase.from("sop_ingredients").insert(
          ingredients.map((ing, j) => ({
            sop_id: savedSopId,
            sort_order: j,
            name: ing.name.trim(),
            amount: ing.amount.trim(),
            unit: ing.unit.trim() || null,
          }))
        )
      );
    }

    const listInserts: { sop_id: string; type: SOPListItemType; label: string; sort_order: number }[] = [];
    tools.forEach((t, j) => listInserts.push({ sop_id: savedSopId!, type: "tool", label: t.label.trim(), sort_order: j }));
    prereqs.forEach((p, j) => listInserts.push({ sop_id: savedSopId!, type: "prereq", label: p.label.trim(), sort_order: j }));
    if (listInserts.length > 0) {
      typeInserts.push(supabase.from("sop_list_items").insert(listInserts));
    }

    if (sopType === "greeting_behavior" && behaviors.length > 0) {
      typeInserts.push(
        supabase.from("sop_behaviors").insert(
          behaviors.map((b, j) => ({
            sop_id: savedSopId,
            sort_order: j,
            trigger_title: b.trigger_title.trim(),
            response_content: b.response_content.trim(),
          }))
        )
      );
    }

    if (typeInserts.length > 0) {
      await Promise.all(typeInserts);
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
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6 flex-wrap">
        <button
          onClick={() => setCurrentTab("info")}
          className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            currentTab === "info"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📝 Basic Info
        </button>
        {(sopType === "recipe" || sopType === "greeting_behavior") && (
          <button
            onClick={() => setCurrentTab("extras")}
            className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              currentTab === "extras"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {sopType === "recipe" ? "🥗 Ingredients & lists" : "💬 When this happens"}
          </button>
        )}
        <button
          onClick={() => setCurrentTab("steps")}
          className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
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
              SOP Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  { value: "procedure" as const, label: "Procedure", emoji: "📋" },
                  { value: "recipe" as const, label: "Recipe", emoji: "📖" },
                  { value: "greeting_behavior" as const, label: "Greeting & behavior", emoji: "💬" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSopType(opt.value)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2 text-center ${
                    sopType === opt.value
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
            onClick={() =>
              setCurrentTab(
                sopType === "recipe" || sopType === "greeting_behavior" ? "extras" : "steps"
              )
            }
            className="w-full bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 transition-colors"
          >
            Next:{" "}
            {sopType === "recipe" || sopType === "greeting_behavior"
              ? "Ingredients & lists / When this happens"
              : "Add Steps"}{" "}
            →
          </button>
        </div>
      )}

      {currentTab === "extras" && sopType === "recipe" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Ingredients</h2>
          <div className="space-y-2">
            {ingredients.map((ing, idx) => (
              <div
                key={ing.id}
                className="flex items-center gap-2 flex-wrap"
              >
                <span className="text-gray-400 w-6">{idx + 1}.</span>
                <input
                  type="text"
                  value={ing.name}
                  onChange={(e) =>
                    setIngredients((prev) =>
                      prev.map((r) => (r.id === ing.id ? { ...r, name: e.target.value } : r))
                    )
                  }
                  placeholder="Name"
                  className="w-32 md:w-40 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  type="text"
                  value={ing.amount}
                  onChange={(e) =>
                    setIngredients((prev) =>
                      prev.map((r) => (r.id === ing.id ? { ...r, amount: e.target.value } : r))
                    )
                  }
                  placeholder="Amount"
                  className="w-24 md:w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  type="text"
                  value={ing.unit}
                  onChange={(e) =>
                    setIngredients((prev) =>
                      prev.map((r) => (r.id === ing.id ? { ...r, unit: e.target.value } : r))
                    )
                  }
                  placeholder="Unit (optional)"
                  className="w-24 md:w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setIngredients((prev) => prev.filter((r) => r.id !== ing.id))}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setIngredients((prev) => [
                  ...prev,
                  { id: `ing-${Date.now()}`, name: "", amount: "", unit: "" },
                ])
              }
              className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add ingredient
            </button>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 pt-2">Tools</h2>
          <div className="space-y-2">
            {tools.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={t.label}
                  onChange={(e) =>
                    setTools((prev) =>
                      prev.map((r) => (r.id === t.id ? { ...r, label: e.target.value } : r))
                    )
                  }
                  placeholder="Tool name"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setTools((prev) => prev.filter((r) => r.id !== t.id))}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setTools((prev) => [...prev, { id: `tool-${Date.now()}`, label: "" }])
              }
              className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add tool
            </button>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 pt-2">Pre-requirements</h2>
          <div className="space-y-2">
            {prereqs.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={p.label}
                  onChange={(e) =>
                    setPrereqs((prev) =>
                      prev.map((r) => (r.id === p.id ? { ...r, label: e.target.value } : r))
                    )
                  }
                  placeholder="Pre-requirement"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setPrereqs((prev) => prev.filter((r) => r.id !== p.id))}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setPrereqs((prev) => [...prev, { id: `prereq-${Date.now()}`, label: "" }])
              }
              className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add pre-requirement
            </button>
          </div>

          <button
            onClick={() => setCurrentTab("steps")}
            className="w-full bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 transition-colors"
          >
            Next: Add Steps →
          </button>
        </div>
      )}

      {currentTab === "extras" && sopType === "greeting_behavior" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">When this happens</h2>
          <p className="text-sm text-gray-500">
            Add scenarios: when a specific behavior happens, what to do.
          </p>
          <div className="space-y-4">
            {behaviors.map((b) => (
              <div
                key={b.id}
                className="border border-gray-200 rounded-xl p-4 space-y-3"
              >
                <input
                  type="text"
                  value={b.trigger_title}
                  onChange={(e) =>
                    setBehaviors((prev) =>
                      prev.map((r) =>
                        r.id === b.id ? { ...r, trigger_title: e.target.value } : r
                      )
                    )
                  }
                  placeholder="e.g. Customer is upset"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium"
                />
                <textarea
                  value={b.response_content}
                  onChange={(e) =>
                    setBehaviors((prev) =>
                      prev.map((r) =>
                        r.id === b.id ? { ...r, response_content: e.target.value } : r
                      )
                    )
                  }
                  placeholder="What to do..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none"
                />
                <button
                  type="button"
                  onClick={() => setBehaviors((prev) => prev.filter((r) => r.id !== b.id))}
                  className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setBehaviors((prev) => [
                  ...prev,
                  { id: `beh-${Date.now()}`, trigger_title: "", response_content: "" },
                ])
              }
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-sm font-medium text-gray-500 hover:border-amber-300 hover:bg-amber-50/50"
            >
              <Plus className="w-4 h-4 inline mr-1" /> Add scenario
            </button>
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
          <StepEditor
            steps={steps}
            onChange={setSteps}
            currentSopId={sopId}
            linkedSopOptions={linkedSopOptions}
          />

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
