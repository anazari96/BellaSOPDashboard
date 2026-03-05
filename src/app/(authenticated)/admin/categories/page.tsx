"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Category } from "@/lib/types";
import { Plus, Edit3, Trash2, X, Check, Loader2 } from "lucide-react";

const EMOJI_OPTIONS = [
  "☕", "🧹", "📖", "😊", "🍳", "🍰", "🌅", "🌙",
  "🥤", "🍵", "🧊", "🥐", "🍞", "🥗", "🔧", "📋",
  "⚡", "🎯", "💧", "🧴", "🧤", "🥄", "🍽️", "📦",
];

const AdminCategoriesPage = () => {
  const { supabase, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    emoji: "📋",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      setCategories(data || []);
    } catch (err) {
      console.error("Fetch categories error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchCategories();
  }, [authLoading, supabase]);

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      emoji: cat.emoji,
      description: cat.description || "",
    });
    setShowNew(false);
  };

  const startNew = () => {
    setShowNew(true);
    setEditingId(null);
    setFormData({ name: "", emoji: "📋", description: "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowNew(false);
    setFormData({ name: "", emoji: "📋", description: "" });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);

    if (editingId) {
      await supabase
        .from("categories")
        .update({
          name: formData.name.trim(),
          emoji: formData.emoji,
          description: formData.description.trim() || null,
        })
        .eq("id", editingId);
    } else {
      const maxOrder = Math.max(0, ...categories.map((c) => c.sort_order));
      await supabase.from("categories").insert({
        name: formData.name.trim(),
        emoji: formData.emoji,
        description: formData.description.trim() || null,
        sort_order: maxOrder + 1,
      });
    }

    setSaving(false);
    cancelEdit();
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? SOPs in this category will need to be reassigned.")) return;
    await supabase.from("categories").delete().eq("id", id);
    fetchCategories();
  };

  const CategoryForm = () => (
    <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Emoji
        </label>
        <div className="flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setFormData({ ...formData, emoji: e })}
              className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                formData.emoji === e
                  ? "bg-amber-100 border-2 border-amber-400 scale-110"
                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Brewing"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Description
        </label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Brief description..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !formData.name.trim()}
          className="flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {editingId ? "Update" : "Create"}
        </button>
        <button
          onClick={cancelEdit}
          className="flex items-center gap-2 text-gray-500 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories 🏷️</h1>
          <p className="text-gray-500 text-sm mt-1">
            Organize your SOPs into categories
          </p>
        </div>
        {!showNew && !editingId && (
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>

      {showNew && <div className="mb-6"><CategoryForm /></div>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) =>
            editingId === cat.id ? (
              <CategoryForm key={cat.id} />
            ) : (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4"
              >
                <span className="text-3xl">{cat.emoji}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-sm text-gray-400">{cat.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCategoriesPage;
