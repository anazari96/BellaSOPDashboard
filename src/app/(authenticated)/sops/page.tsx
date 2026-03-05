"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import SOPCard from "@/components/sop/SOPCard";
import type { SOP, Category, SOPImportance } from "@/lib/types";
import { Search, Filter, X } from "lucide-react";

const SOPBrowsePage = () => {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");
  const { supabase, loading: authLoading } = useAuth();

  const [sops, setSops] = useState<SOP[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [importanceFilter, setImportanceFilter] = useState<SOPImportance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const fetchCategories = async () => {
      try {
        const { data } = await supabase
          .from("categories")
          .select("*")
          .order("sort_order");
        setCategories(data || []);
      } catch (err) {
        console.error("Fetch categories error:", err);
      }
    };
    fetchCategories();
  }, [authLoading, supabase]);

  useEffect(() => {
    if (authLoading) return;
    const fetchSops = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("sops")
          .select("*, category:categories(name, emoji)")
          .eq("status", "published")
          .order("updated_at", { ascending: false });

        if (selectedCategory) {
          query = query.eq("category_id", selectedCategory);
        }
        if (importanceFilter) {
          query = query.eq("importance", importanceFilter);
        }
        if (searchQuery.trim()) {
          query = query.ilike("title", `%${searchQuery}%`);
        }

        const { data } = await query;
        setSops(data || []);
      } catch (err) {
        console.error("Fetch SOPs error:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSops, 300);
    return () => clearTimeout(debounce);
  }, [authLoading, supabase, selectedCategory, importanceFilter, searchQuery]);

  const clearFilters = () => {
    setSelectedCategory(null);
    setImportanceFilter(null);
    setSearchQuery("");
  };

  const hasFilters = selectedCategory || importanceFilter || searchQuery;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Browse SOPs 📋</h1>
        <p className="text-gray-500 text-sm mt-1">
          Find and follow standard operating procedures
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search SOPs..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900 placeholder-gray-400 bg-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            !selectedCategory
              ? "bg-amber-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              setSelectedCategory(
                selectedCategory === cat.id ? null : cat.id
              )
            }
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
              selectedCategory === cat.id
                ? "bg-amber-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span>{cat.emoji}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Importance filter */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-gray-400" />
        {(["critical", "high", "medium", "low"] as SOPImportance[]).map(
          (level) => (
            <button
              key={level}
              onClick={() =>
                setImportanceFilter(importanceFilter === level ? null : level)
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                importanceFilter === level
                  ? "bg-amber-100 text-amber-700 border border-amber-300"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {level === "critical" && "🔴"}
              {level === "high" && "🟠"}
              {level === "medium" && "🟡"}
              {level === "low" && "🟢"}{" "}
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          )
        )}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : sops.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sops.map((sop) => (
            <SOPCard key={sop.id} sop={sop} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">🔍</span>
          <p className="text-gray-500 font-medium">No SOPs found</p>
          <p className="text-gray-400 text-sm mt-1">
            Try adjusting your filters or search query
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-amber-600 text-sm font-medium hover:text-amber-700"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SOPBrowsePage;
