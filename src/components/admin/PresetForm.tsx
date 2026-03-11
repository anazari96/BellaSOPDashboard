"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import ImportanceBadge from "@/components/sop/ImportanceBadge";
import type { SOP, SOPPreset } from "@/lib/types";
import {
  Plus,
  Trash2,
  GripVertical,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Save,
  Globe,
} from "lucide-react";

const EMOJI_OPTIONS = [
  "📚", "📋", "📖", "🗂️", "📁", "📂", "🗃️", "📑", "📝", "✅",
  "🎯", "⭐", "🔖", "🏷️", "📌", "🔑", "💡", "🛠️", "☕", "🍵",
];

interface PresetFormProps {
  presetId?: string;
}

const PresetForm = ({ presetId }: PresetFormProps) => {
  const router = useRouter();
  const { supabase, profile } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [selectedSOPs, setSelectedSOPs] = useState<SOP[]>([]);
  const [sopSearch, setSopSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SOP[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!presetId);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Load existing preset for editing
  useEffect(() => {
    if (!presetId) return;
    const load = async () => {
      const { data: preset } = await supabase
        .from("sop_presets")
        .select("*")
        .eq("id", presetId)
        .single();

      if (preset) {
        setTitle(preset.title);
        setDescription(preset.description || "");
        setEmoji(preset.emoji);
      }

      const { data: items } = await supabase
        .from("sop_preset_items")
        .select("*, sop:sops(*, category:categories(name, emoji))")
        .eq("preset_id", presetId)
        .order("sort_order");

      if (items) {
        setSelectedSOPs(items.map((item) => item.sop as SOP).filter(Boolean));
      }

      setLoading(false);
    };
    load();
  }, [presetId, supabase]);

  // Debounced SOP search
  useEffect(() => {
    if (!sopSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const { data } = await supabase
        .from("sops")
        .select("*, category:categories(name, emoji)")
        .eq("status", "published")
        .ilike("title", `%${sopSearch}%`)
        .order("title")
        .limit(10);
      setSearchResults(data || []);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [sopSearch, supabase]);

  const addSOP = useCallback(
    (sop: SOP) => {
      if (selectedSOPs.find((s) => s.id === sop.id)) return;
      setSelectedSOPs((prev) => [...prev, sop]);
      setSopSearch("");
      setSearchResults([]);
    },
    [selectedSOPs]
  );

  const removeSOP = useCallback((sopId: string) => {
    setSelectedSOPs((prev) => prev.filter((s) => s.id !== sopId));
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setSelectedSOPs((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setSelectedSOPs((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleSave = async (publish: boolean) => {
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (selectedSOPs.length === 0) {
      setError("Add at least one SOP to the preset.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        emoji,
        status: publish ? "published" : "draft",
        created_by: profile?.id ?? null,
        updated_at: new Date().toISOString(),
      };

      let id = presetId;

      if (presetId) {
        const { error: updateErr } = await supabase
          .from("sop_presets")
          .update(payload)
          .eq("id", presetId);
        if (updateErr) throw updateErr;
      } else {
        const { data, error: insertErr } = await supabase
          .from("sop_presets")
          .insert(payload)
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        id = data.id;
      }

      // Replace preset items
      await supabase.from("sop_preset_items").delete().eq("preset_id", id!);
      const items = selectedSOPs.map((sop, idx) => ({
        preset_id: id!,
        sop_id: sop.id,
        sort_order: idx,
      }));
      const { error: itemsErr } = await supabase
        .from("sop_preset_items")
        .insert(items);
      if (itemsErr) throw itemsErr;

      router.push("/admin/presets");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save preset.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {presetId ? "Edit Preset ✏️" : "New Preset 📚"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Group related SOPs together so staff can read them as a set
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
          Preset Details
        </h2>

        {/* Emoji + Title row */}
        <div className="flex items-start gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="w-14 h-14 text-2xl bg-amber-50 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors flex items-center justify-center"
            >
              {emoji}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-16 left-0 z-10 bg-white border border-gray-200 rounded-xl p-3 shadow-lg grid grid-cols-5 gap-1 w-52">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setEmoji(e);
                      setShowEmojiPicker(false);
                    }}
                    className={`text-xl p-1.5 rounded-lg hover:bg-amber-50 transition-colors ${
                      emoji === e ? "bg-amber-100" : ""
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Opening Shift Essentials"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What should staff know before starting this preset?"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900 resize-none"
          />
        </div>
      </div>

      {/* SOP picker */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
            SOPs in this Preset
          </h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
            {selectedSOPs.length} SOP{selectedSOPs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Search box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={sopSearch}
            onChange={(e) => setSopSearch(e.target.value)}
            placeholder="Search published SOPs to add..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900"
          />
          {sopSearch && (
            <button
              type="button"
              onClick={() => {
                setSopSearch("");
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Dropdown */}
          {(searchResults.length > 0 || searchLoading) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
              {searchLoading ? (
                <div className="px-4 py-3 text-sm text-gray-400">
                  Searching...
                </div>
              ) : (
                searchResults
                  .filter((r) => !selectedSOPs.find((s) => s.id === r.id))
                  .map((sop) => (
                    <button
                      key={sop.id}
                      type="button"
                      onClick={() => addSOP(sop)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors text-left"
                    >
                      <span className="text-lg">
                        {sop.category?.emoji || "📋"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {sop.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {sop.category?.name}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-amber-600 shrink-0" />
                    </button>
                  ))
              )}
              {!searchLoading &&
                searchResults.filter(
                  (r) => !selectedSOPs.find((s) => s.id === r.id)
                ).length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-400">
                    No results (or all already added)
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Selected SOPs list */}
        {selectedSOPs.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
            <span className="text-3xl block mb-2">📋</span>
            <p className="text-sm text-gray-400">
              Search and add SOPs above to build your preset
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedSOPs.map((sop, idx) => (
              <div
                key={sop.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
              >
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />

                <span className="text-base shrink-0">
                  {sop.category?.emoji || "📋"}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {sop.title}
                  </p>
                  <p className="text-xs text-gray-400">{sop.category?.name}</p>
                </div>

                <ImportanceBadge importance={sop.importance} />

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors rounded"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === selectedSOPs.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors rounded"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSOP(sop.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save buttons */}
      <div className="flex items-center gap-3 justify-end pb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Save as Draft
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          <Globe className="w-4 h-4" />
          {saving ? "Saving..." : "Save & Publish"}
        </button>
      </div>
    </div>
  );
};

export default PresetForm;
