"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Plus } from "lucide-react";
import type { SOP, NotePriority } from "@/lib/types";

interface StaffNoteFormProps {
  staffId: string;
  sops: Pick<SOP, "id" | "title">[];
  onNoteAdded: () => void;
}

const StaffNoteForm = ({ staffId, sops, onNoteAdded }: StaffNoteFormProps) => {
  const { supabase, user } = useAuth();
  const [sopId, setSopId] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<NotePriority>("medium");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || !user) return;

    setSaving(true);
    try {
      await supabase.from("admin_staff_notes").insert({
        admin_id: user.id,
        staff_id: staffId,
        sop_id: sopId || null,
        note: note.trim(),
        priority,
      });

      setNote("");
      setSopId("");
      setPriority("medium");
      onNoteAdded();
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3"
    >
      <h4 className="font-semibold text-gray-900 text-sm">Add Note</h4>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Describe the issue or area that needs focus..."
        rows={3}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
      />

      <div className="flex flex-col gap-3">
        <select
          value={sopId}
          onChange={(e) => setSopId(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">General (no specific SOP)</option>
          {sops.map((sop) => (
            <option key={sop.id} value={sop.id}>
              {sop.title}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as NotePriority)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>

        <button
          type="submit"
          disabled={saving || !note.trim()}
          className="inline-flex items-center justify-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 shrink-0"
        >
          <Plus className="w-4 h-4" />
          {saving ? "Adding..." : "Add Note"}
        </button>
      </div>
    </form>
  );
};

export default StaffNoteForm;
