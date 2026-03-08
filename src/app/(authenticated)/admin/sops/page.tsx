"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import ImportanceBadge from "@/components/sop/ImportanceBadge";
import type { SOP } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Plus, Edit3, Eye, Trash2, Search } from "lucide-react";

const AdminSOPListPage = () => {
  const { supabase, loading: authLoading } = useAuth();
  const [sops, setSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSops = async () => {
    try {
      let query = supabase
        .from("sops")
        .select("*, category:categories(name, emoji)")
        .order("updated_at", { ascending: false });

      if (search.trim()) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data } = await query;
      setSops(data || []);
    } catch (err) {
      console.error("Fetch SOPs error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    const debounce = setTimeout(fetchSops, 300);
    return () => clearTimeout(debounce);
  }, [authLoading, search, supabase]);

  const handleDelete = async (sopId: string) => {
    if (!confirm("Are you sure you want to delete this SOP? This cannot be undone.")) return;
    setDeleting(sopId);

    await supabase.from("sops").delete().eq("id", sopId);

    setSops((prev) => prev.filter((s) => s.id !== sopId));
    setDeleting(null);
  };

  const togglePublish = async (sop: SOP) => {
    const newStatus = sop.status === "published" ? "draft" : "published";
    await supabase.from("sops").update({ status: newStatus }).eq("id", sop.id);
    setSops((prev) =>
      prev.map((s) => (s.id === sop.id ? { ...s, status: newStatus } : s))
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage SOPs ⚙️</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create, edit, and publish your standard operating procedures
          </p>
        </div>
        <Link
          href="/admin/sops/new"
          className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New SOP</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SOPs..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900 bg-white"
        />
      </div>

      {/* SOP Table/List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : sops.length > 0 ? (
        <div className="space-y-3">
          {sops.map((sop) => (
            <div
              key={sop.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 flex items-center gap-4"
            >
              <span className="text-2xl hidden sm:block">
                {sop.category?.emoji || "📋"}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {sop.title}
                  </h3>
                  <ImportanceBadge importance={sop.importance} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{sop.category?.name}</span>
                  <span>Updated {formatDate(sop.updated_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePublish(sop)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sop.status === "published"
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {sop.status === "published" ? "✅ Published" : "📝 Draft"}
                </button>

                <Link
                  href={`/sops/${sop.id}`}
                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </Link>
                <Link
                  href={`/admin/sops/${sop.id}/edit`}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(sop.id)}
                  disabled={deleting === sop.id}
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
          <span className="text-5xl block mb-4">📋</span>
          <p className="text-gray-500 font-medium">No SOPs yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Create your first standard operating procedure
          </p>
          <Link
            href="/admin/sops/new"
            className="inline-flex items-center gap-2 mt-4 bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700"
          >
            <Plus className="w-4 h-4" />
            Create SOP
          </Link>
        </div>
      )}
    </div>
  );
};

export default AdminSOPListPage;
