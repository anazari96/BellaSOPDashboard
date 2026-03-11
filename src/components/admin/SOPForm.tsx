"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/components/auth/AuthProvider";
import StepEditor, { type StepData } from "./StepEditor";
import type {
  Category,
  SOPStatus,
  SOPType,
  SOPListItemType,
} from "@/lib/types";
import { Loader2, Save, Eye, Plus, Trash2, GripVertical } from "lucide-react";

const sopFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  categoryId: z.string().min(1, "Please select a category"),
  importance: z.enum(["critical", "high", "medium", "low"]),
  status: z.enum(["draft", "published"]),
  sopType: z.enum(["procedure", "recipe", "greeting_behavior"]),
  steps: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        tip: z.string(),
        warning: z.string(),
        media: z.array(
          z.object({
            id: z.string().optional(),
            media_url: z.string(),
            media_type: z.enum(["image", "video"]),
            caption: z.string(),
          })
        ),
        linked_sop_id: z.string().nullable().optional(),
        linked_sop: z
          .object({
            id: z.string(),
            title: z.string(),
            category: z.object({ name: z.string(), emoji: z.string() }).optional(),
          })
          .optional(),
      })
    )
    .min(1, "At least one step is required"),
  ingredients: z.array(
    z.object({ id: z.string(), name: z.string(), amount: z.string(), unit: z.string() })
  ),
  tools: z.array(z.object({ id: z.string(), label: z.string() })),
  prereqs: z.array(z.object({ id: z.string(), label: z.string() })),
  behaviors: z.array(
    z.object({ id: z.string(), trigger_title: z.string(), response_content: z.string() })
  ),
});

type SOPFormValues = z.infer<typeof sopFormSchema>;

const DEFAULT_VALUES: SOPFormValues = {
  title: "",
  description: "",
  categoryId: "",
  importance: "medium",
  status: "draft",
  sopType: "procedure",
  steps: [
    { id: "temp-1", title: "", content: "", tip: "", warning: "", media: [], linked_sop_id: null },
  ],
  ingredients: [],
  tools: [],
  prereqs: [],
  behaviors: [],
};

const DRAFT_KEY_PREFIX = "sop-form-draft";

interface SOPFormProps {
  sopId?: string;
}

const SOPForm = ({ sopId }: SOPFormProps) => {
  const router = useRouter();
  const { user, supabase, loading: authLoading } = useAuth();
  const isEditing = Boolean(sopId);
  const draftKey = `${DRAFT_KEY_PREFIX}-${sopId || "new"}`;

  const [categories, setCategories] = useState<Category[]>([]);
  const [linkedSopOptions, setLinkedSopOptions] = useState<
    { id: string; title: string; category?: { name: string; emoji: string } }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<"info" | "extras" | "steps">("info");

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SOPFormValues>({
    resolver: zodResolver(sopFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const sopType = watch("sopType");
  const importance = watch("importance");
  const categoryId = watch("categoryId");
  const title = watch("title");
  const stepsCount = watch("steps").length;

  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray({ control, name: "ingredients" });

  const {
    fields: toolFields,
    append: appendTool,
    remove: removeTool,
  } = useFieldArray({ control, name: "tools" });

  const {
    fields: prereqFields,
    append: appendPrereq,
    remove: removePrereq,
  } = useFieldArray({ control, name: "prereqs" });

  const {
    fields: behaviorFields,
    append: appendBehavior,
    remove: removeBehavior,
  } = useFieldArray({ control, name: "behaviors" });

  // ── Data fetching + draft restoration ──────────────────────────────────

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

        let formValues: SOPFormValues = {
          ...DEFAULT_VALUES,
          categoryId: cats[0]?.id || "",
        };

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
            formValues = {
              ...formValues,
              title: sopRes.data.title,
              description: sopRes.data.description || "",
              categoryId: sopRes.data.category_id,
              importance: sopRes.data.importance,
              status: sopRes.data.status,
              sopType: (sopRes.data.sop_type as SOPType) || "procedure",
            };
          }

          if (stepsRes.data?.length) {
            formValues.steps = stepsRes.data.map(
              (s: {
                id: string;
                title: string;
                content: string;
                tip: string | null;
                warning: string | null;
                linked_sop_id: string | null;
                media?: {
                  id: string;
                  media_url: string;
                  media_type: "image" | "video";
                  caption: string | null;
                }[];
              }) => ({
                id: s.id,
                title: s.title,
                content: s.content,
                tip: s.tip || "",
                warning: s.warning || "",
                linked_sop_id: s.linked_sop_id ?? null,
                media: (s.media || []).map(
                  (m: {
                    id: string;
                    media_url: string;
                    media_type: "image" | "video";
                    caption: string | null;
                  }) => ({
                    id: m.id,
                    media_url: m.media_url,
                    media_type: m.media_type,
                    caption: m.caption || "",
                  })
                ),
              })
            );
          }

          if (ingRes.data?.length) {
            formValues.ingredients = ingRes.data.map(
              (r: { id: string; name: string; amount: string; unit: string | null }) => ({
                id: r.id,
                name: r.name,
                amount: r.amount,
                unit: r.unit || "",
              })
            );
          }

          if (listRes.data?.length) {
            formValues.tools = listRes.data
              .filter((r: { type: string }) => r.type === "tool")
              .map((r: { id: string; label: string }) => ({ id: r.id, label: r.label }));
            formValues.prereqs = listRes.data
              .filter((r: { type: string }) => r.type === "prereq")
              .map((r: { id: string; label: string }) => ({ id: r.id, label: r.label }));
          }

          if (behRes.data?.length) {
            formValues.behaviors = behRes.data.map(
              (r: { id: string; trigger_title: string; response_content: string }) => ({
                id: r.id,
                trigger_title: r.trigger_title,
                response_content: r.response_content,
              })
            );
          }
        }

        try {
          const savedDraft = localStorage.getItem(draftKey);
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft) as Partial<SOPFormValues>;
            if (parsed.title !== undefined) {
              formValues = { ...formValues, ...parsed };
            }
          }
        } catch {
          /* corrupted draft – ignore */
        }

        reset(formValues);
      } catch (err) {
        console.error("SOPForm fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sopId, authLoading, supabase, draftKey, reset]);

  // ── Auto-save draft to localStorage (1 s debounce) ────────────────────

  const draftTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) return;

    const subscription = watch((values) => {
      if (draftTimeout.current) clearTimeout(draftTimeout.current);
      draftTimeout.current = setTimeout(() => {
        try {
          localStorage.setItem(draftKey, JSON.stringify(values));
        } catch {
          /* storage unavailable */
        }
      }, 1000);
    });

    return () => {
      if (draftTimeout.current) clearTimeout(draftTimeout.current);
      subscription.unsubscribe();
    };
  }, [watch, draftKey, loading]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* noop */
    }
  }, [draftKey]);

  // ── Save handler ───────────────────────────────────────────────────────

  const onSave = async (data: SOPFormValues, publishNow: boolean) => {
    setSaving(true);

    try {
      const sopData = {
        title: data.title.trim(),
        description: data.description.trim() || null,
        category_id: data.categoryId,
        importance: data.importance,
        status: publishNow ? ("published" as SOPStatus) : data.status,
        sop_type: data.sopType,
        created_by: user?.id,
      };

      let savedSopId = sopId;

      if (isEditing && sopId) {
        await supabase.from("sops").update(sopData).eq("id", sopId);
      } else {
        const { data: newSop } = await supabase
          .from("sops")
          .insert(sopData)
          .select("id")
          .single();
        savedSopId = newSop?.id;
      }

      if (!savedSopId) {
        setSaving(false);
        return;
      }

      if (isEditing) {
        await supabase.from("sop_steps").delete().eq("sop_id", savedSopId);
      }

      const validSteps = data.steps.filter((s) => s.title.trim() || s.content.trim());
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

        if (insertedSteps) {
          const allMedia: {
            step_id: string;
            media_url: string;
            media_type: string;
            caption: string | null;
            sort_order: number;
          }[] = [];

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

      await Promise.all([
        supabase.from("sop_ingredients").delete().eq("sop_id", savedSopId),
        supabase.from("sop_list_items").delete().eq("sop_id", savedSopId),
        supabase.from("sop_behaviors").delete().eq("sop_id", savedSopId),
      ]);

      const typeInserts: PromiseLike<unknown>[] = [];

      if (data.sopType === "recipe" && data.ingredients.length > 0) {
        typeInserts.push(
          supabase.from("sop_ingredients").insert(
            data.ingredients.map((ing, j) => ({
              sop_id: savedSopId,
              sort_order: j,
              name: ing.name.trim(),
              amount: ing.amount.trim(),
              unit: ing.unit.trim() || null,
            }))
          )
        );
      }

      const listInserts: {
        sop_id: string;
        type: SOPListItemType;
        label: string;
        sort_order: number;
      }[] = [];
      data.tools.forEach((t, j) =>
        listInserts.push({ sop_id: savedSopId!, type: "tool", label: t.label.trim(), sort_order: j })
      );
      data.prereqs.forEach((p, j) =>
        listInserts.push({ sop_id: savedSopId!, type: "prereq", label: p.label.trim(), sort_order: j })
      );
      if (listInserts.length > 0) {
        typeInserts.push(supabase.from("sop_list_items").insert(listInserts));
      }

      if (data.sopType === "greeting_behavior" && data.behaviors.length > 0) {
        typeInserts.push(
          supabase.from("sop_behaviors").insert(
            data.behaviors.map((b, j) => ({
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

      clearDraft();
      setSaving(false);
      router.push("/admin/sops");
      router.refresh();
    } catch (err) {
      console.error("SOPForm save error:", err);
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

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
          📋 Steps ({stepsCount})
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
              {...register("title")}
              placeholder="e.g., Morning Espresso Machine Startup"
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none text-sm text-gray-900 placeholder-gray-400 ${
                errors.title
                  ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                  : "border-gray-200 focus:border-amber-400 focus:ring-amber-100"
              }`}
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              {...register("description")}
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
                  onClick={() => setValue("categoryId", cat.id, { shouldValidate: true })}
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
            {errors.categoryId && (
              <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
            )}
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
                  onClick={() => setValue("sopType", opt.value)}
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
                  onClick={() => setValue("importance", opt.value)}
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
            {ingredientFields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-400 w-6">{idx + 1}.</span>
                <input
                  type="text"
                  {...register(`ingredients.${idx}.name`)}
                  placeholder="Name"
                  className="w-32 md:w-40 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  type="text"
                  {...register(`ingredients.${idx}.amount`)}
                  placeholder="Amount"
                  className="w-24 md:w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  type="text"
                  {...register(`ingredients.${idx}.unit`)}
                  placeholder="Unit (optional)"
                  className="w-24 md:w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(idx)}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                appendIngredient({ id: `ing-${Date.now()}`, name: "", amount: "", unit: "" })
              }
              className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add ingredient
            </button>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 pt-2">Tools</h2>
          <div className="space-y-2">
            {toolFields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  {...register(`tools.${idx}.label`)}
                  placeholder="Tool name"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeTool(idx)}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendTool({ id: `tool-${Date.now()}`, label: "" })}
              className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add tool
            </button>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 pt-2">Pre-requirements</h2>
          <div className="space-y-2">
            {prereqFields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  {...register(`prereqs.${idx}.label`)}
                  placeholder="Pre-requirement"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removePrereq(idx)}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendPrereq({ id: `prereq-${Date.now()}`, label: "" })}
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
            {behaviorFields.map((field, idx) => (
              <div
                key={field.id}
                className="border border-gray-200 rounded-xl p-4 space-y-3"
              >
                <input
                  type="text"
                  {...register(`behaviors.${idx}.trigger_title`)}
                  placeholder="e.g. Customer is upset"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium"
                />
                <textarea
                  {...register(`behaviors.${idx}.response_content`)}
                  placeholder="What to do..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none"
                />
                <button
                  type="button"
                  onClick={() => removeBehavior(idx)}
                  className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                appendBehavior({
                  id: `beh-${Date.now()}`,
                  trigger_title: "",
                  response_content: "",
                })
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
          <Controller
            control={control}
            name="steps"
            render={({ field }) => (
              <StepEditor
                steps={field.value as StepData[]}
                onChange={field.onChange}
                currentSopId={sopId}
                linkedSopOptions={linkedSopOptions}
              />
            )}
          />

          <div className="flex items-center gap-3 pt-4 border-t border-gray-100 mt-6">
            <button
              onClick={handleSubmit((data) => onSave(data, false))}
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
              onClick={handleSubmit((data) => onSave(data, true))}
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
