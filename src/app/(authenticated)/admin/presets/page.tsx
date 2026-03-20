"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import type { SOPPreset } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Plus, Edit3, Trash2, Search, Globe, FileText, BrainCircuit, Loader2 } from "lucide-react";

const AdminPresetsPage = () => {
  const { supabase, loading: authLoading } = useAuth();
  const [presets, setPresets] = useState<SOPPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchPresets = async () => {
    try {
      let query = supabase
        .from("sop_presets")
        .select("*, items:sop_preset_items(id), questions:sop_preset_questions(id)")
        .order("updated_at", { ascending: false });

      if (search.trim()) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data } = await query;
      setPresets(data || []);
    } catch (err) {
      console.error("Fetch presets error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    const debounce = setTimeout(fetchPresets, 300);
    return () => clearTimeout(debounce);
  }, [authLoading, search, supabase]);

  const handleDelete = async (presetId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this preset? This cannot be undone."
      )
    )
      return;
    setDeleting(presetId);
    await supabase.from("sop_presets").delete().eq("id", presetId);
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
    setDeleting(null);
  };

  const togglePublish = async (preset: SOPPreset) => {
    const newStatus = preset.status === "published" ? "draft" : "published";
    await supabase
      .from("sop_presets")
      .update({ status: newStatus })
      .eq("id", preset.id);
    setPresets((prev) =>
      prev.map((p) => (p.id === preset.id ? { ...p, status: newStatus } : p))
    );
  };

  const handleGenerateQuiz = async (presetId: string) => {
    setGenerating(presetId);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const res = await fetch(`/api/admin/presets/${presetId}/generate-quiz`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authSession?.access_token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate quiz");
      }

      const result = await res.json();
      alert(`Successfully generated ${result.count} questions for this preset.`);
      fetchPresets(); // Refresh to show question count
    } catch (err) {
      console.error("Generate quiz error:", err);
      alert(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manage Presets 📚
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Group SOPs together into reading sets for your staff
          </p>
        </div>
        <Link
          href="/admin/presets/new"
          className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Preset</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search presets..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900 bg-white"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : presets.length > 0 ? (
        <div className="space-y-3">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 flex flex-col lg:flex-row lg:items-center gap-4"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <span className="text-3xl hidden sm:block shrink-0 mt-1">{preset.emoji}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">
                      {preset.title}
                    </h3>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg shrink-0">
                      {(preset.items as { id: string }[] | undefined)?.length ?? 0}{" "}
                      SOPs
                    </span>
                  </div>
                  {preset.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                      {preset.description}
                    </p>
                  )}
                  
                  <div className="flex items-center flex-wrap gap-3 mt-2">
                    <p className="text-xs text-gray-400">
                      Updated {formatDate(preset.updated_at)}
                    </p>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1.5 ${
                      (preset as any).questions?.length > 0 
                        ? "bg-blue-50 text-blue-700 border border-blue-200" 
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                      <BrainCircuit className="w-3.5 h-3.5" />
                      {(preset as any).questions?.length ?? 0} Questions
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 shrink-0">
                <button
                  onClick={() => handleGenerateQuiz(preset.id)}
                  disabled={generating === preset.id}
                  className="flex-1 lg:flex-none justify-center px-4 py-2 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-50 flex items-center gap-2"
                  title="Generate Quiz with AI"
                >
                  {generating === preset.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BrainCircuit className="w-4 h-4" />
                  )}
                  {generating === preset.id ? "Generating..." : "Generate Quiz"}
                </button>
                <button
                  onClick={() => togglePublish(preset)}
                  className={`flex-1 lg:flex-none justify-center px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    preset.status === "published"
                      ? "bg-green-50 text-green-700 hover:bg-green-100 border border-transparent"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent"
                  }`}
                >
                  {preset.status === "published" ? (
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4" /> Published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Draft
                    </span>
                  )}
                </button>

                <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                  <Link
                    href={`/admin/presets/${preset.id}/edit`}
                    className="flex-1 sm:flex-none flex justify-center p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all bg-gray-50 lg:bg-transparent"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(preset.id)}
                    disabled={deleting === preset.id}
                    className="flex-1 sm:flex-none flex justify-center p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all bg-gray-50 lg:bg-transparent disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <span className="text-5xl block mb-4">📚</span>
          <p className="text-gray-500 font-medium">No presets yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Create a preset to group SOPs that staff should read together
          </p>
          <Link
            href="/admin/presets/new"
            className="inline-flex items-center gap-2 mt-4 bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700"
          >
            <Plus className="w-4 h-4" />
            Create Preset
          </Link>
        </div>
      )}
    </div>
  );
};

export default AdminPresetsPage;
