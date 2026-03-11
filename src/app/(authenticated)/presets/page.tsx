"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import type { SOPPreset } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ChevronRight, Search, X } from "lucide-react";

const PresetsPage = () => {
  const { supabase, loading: authLoading } = useAuth();
  const [presets, setPresets] = useState<SOPPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    const fetchPresets = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("sop_presets")
          .select("*, items:sop_preset_items(id)")
          .eq("status", "published")
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

    const debounce = setTimeout(fetchPresets, 300);
    return () => clearTimeout(debounce);
  }, [authLoading, supabase, search]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reading Presets 📚</h1>
        <p className="text-gray-500 text-sm mt-1">
          Curated sets of SOPs to read together for a complete picture
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search presets..."
          className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900 placeholder-gray-400 bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : presets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <Link key={preset.id} href={`/presets/${preset.id}`}>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-amber-200 transition-all group cursor-pointer h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{preset.emoji}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                    {(preset.items as { id: string }[] | undefined)?.length ?? 0}{" "}
                    SOPs
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-amber-700 transition-colors line-clamp-2">
                  {preset.title}
                </h3>

                {preset.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-3 flex-1">
                    {preset.description}
                  </p>
                )}

                <div className="mt-auto pt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>Updated {formatDate(preset.updated_at)}</span>
                  <span className="flex items-center gap-1 text-amber-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Start reading <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <span className="text-5xl block mb-4">📚</span>
          <p className="text-gray-500 font-medium">No presets available</p>
          <p className="text-gray-400 text-sm mt-1">
            {search
              ? "Try a different search term"
              : "Your admin hasn't created any presets yet"}
          </p>
        </div>
      )}
    </div>
  );
};

export default PresetsPage;
