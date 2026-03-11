"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import type { SOPPreset } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Plus, Edit3, Trash2, Search, Globe, FileText } from "lucide-react";

const AdminPresetsPage = () => {
  const { supabase, loading: authLoading } = useAuth();
  const [presets, setPresets] = useState<SOPPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPresets = async () => {
    try {
      let query = supabase
        .from("sop_presets")
        .select("*, items:sop_preset_items(id)")
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
              className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 flex items-center gap-4"
            >
              <span className="text-2xl hidden sm:block">{preset.emoji}</span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {preset.title}
                  </h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
                    {(preset.items as { id: string }[] | undefined)?.length ?? 0}{" "}
                    SOPs
                  </span>
                </div>
                {preset.description && (
                  <p className="text-xs text-gray-400 truncate">
                    {preset.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  Updated {formatDate(preset.updated_at)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePublish(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    preset.status === "published"
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {preset.status === "published" ? (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Draft
                    </span>
                  )}
                </button>

                <Link
                  href={`/admin/presets/${preset.id}/edit`}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(preset.id)}
                  disabled={deleting === preset.id}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
