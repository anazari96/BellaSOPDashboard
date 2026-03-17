"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import StaffNoteForm from "@/components/admin/StaffNoteForm";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  GraduationCap,
  StickyNote,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import type { Profile, TrainingSession, AdminStaffNote, SOP } from "@/lib/types";

const StaffTrainingDetailPage = () => {
  const params = useParams();
  const staffId = params.staffId as string;
  const { supabase, loading: authLoading } = useAuth();

  const [staff, setStaff] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<(TrainingSession & { sop: SOP })[]>([]);
  const [notes, setNotes] = useState<AdminStaffNote[]>([]);
  const [sops, setSops] = useState<Pick<SOP, "id" | "title">[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genSopId, setGenSopId] = useState("");
  const [genMessage, setGenMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, sessionsRes, notesRes, sopsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", staffId).single(),
        supabase
          .from("training_sessions")
          .select("*, sop:sops(id, title, category:categories(name, emoji))")
          .eq("user_id", staffId)
          .order("generated_at", { ascending: false }),
        supabase
          .from("admin_staff_notes")
          .select("*, sop:sops(id, title), admin:profiles!admin_staff_notes_admin_id_fkey(full_name)")
          .eq("staff_id", staffId)
          .order("created_at", { ascending: false }),
        supabase.from("sops").select("id, title").eq("status", "published").order("title"),
      ]);

      setStaff(profileRes.data);
      setSessions((sessionsRes.data as unknown as (TrainingSession & { sop: SOP })[]) || []);
      setNotes((notesRes.data as unknown as AdminStaffNote[]) || []);
      setSops(sopsRes.data || []);
    } catch (err) {
      console.error("Failed to fetch staff detail:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, staffId]);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, fetchData]);

  const triggerGeneration = async () => {
    setGenerating(true);
    setGenMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const body: Record<string, string> = { userId: staffId };
      if (genSopId) body.sopId = genSopId;

      const res = await fetch("/api/generate-training", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setGenMessage(
          data.generated > 0
            ? "Training session generated successfully!"
            : "Could not generate — staff may already have a session in progress."
        );
        fetchData();
      } else {
        setGenMessage(`Error: ${data.error}`);
      }
    } catch {
      setGenMessage("Failed to trigger generation.");
    } finally {
      setGenerating(false);
    }
  };

  const markNoteAddressed = async (noteId: string) => {
    await supabase
      .from("admin_staff_notes")
      .update({ addressed: true })
      .eq("id", noteId);
    fetchData();
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    await supabase.from("admin_staff_notes").delete().eq("id", noteId);
    fetchData();
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return null;
    const color =
      score >= 80
        ? "bg-green-100 text-green-700"
        : score >= 60
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
        {score}%
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      pending: { bg: "bg-amber-100", text: "text-amber-700" },
      in_progress: { bg: "bg-blue-100", text: "text-blue-700" },
      completed: { bg: "bg-green-100", text: "text-green-700" },
    };
    const style = map[status] || { bg: "bg-gray-100", text: "text-gray-500" };
    return (
      <span
        className={`text-xs font-medium px-2.5 py-1 rounded-full ${style.bg} ${style.text} capitalize`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-gray-500">Staff member not found.</p>
      </div>
    );
  }

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const scores = completedSessions
    .map((s) => s.score)
    .filter((s): s is number => s !== null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/training"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{staff.full_name}</h1>
          <p className="text-sm text-gray-500">
            {completedSessions.length} sessions · Avg score:{" "}
            {avgScore !== null ? `${avgScore}%` : "--"}
          </p>
        </div>
      </div>

      {/* Generate training */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-amber-600" />
          Generate Training
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={genSopId}
            onChange={(e) => setGenSopId(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Auto-select best SOP</option>
            {sops.map((sop) => (
              <option key={sop.id} value={sop.id}>
                {sop.title}
              </option>
            ))}
          </select>
          <button
            onClick={triggerGeneration}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Generate Now"}
          </button>
        </div>
        {genMessage && (
          <p className="text-sm text-blue-600 mt-3">{genMessage}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training history */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Training History</h3>
          </div>
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No training sessions yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {sessions.map((session) => (
                <div key={session.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.sop?.title || "Unknown SOP"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.generated_at).toLocaleDateString()}
                      {session.completed_at &&
                        ` · Completed ${new Date(session.completed_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getScoreBadge(session.score)}
                    {getStatusBadge(session.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin notes */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-600" />
                Notes
              </h3>
            </div>

            {notes.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No notes yet. Add one below.
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`px-5 py-3 ${note.addressed ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              note.priority === "high"
                                ? "bg-red-100 text-red-700"
                                : note.priority === "medium"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {note.priority}
                          </span>
                          {note.sop && (
                            <span className="text-xs text-gray-500 truncate">
                              {note.sop.title}
                            </span>
                          )}
                          {note.addressed && (
                            <span className="text-xs text-green-600 font-medium">
                              Addressed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{note.note}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!note.addressed && (
                          <button
                            onClick={() => markNoteAddressed(note.id)}
                            title="Mark as addressed"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNote(note.id)}
                          title="Delete note"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add note form */}
          <StaffNoteForm
            staffId={staffId}
            sops={sops}
            onNoteAdded={fetchData}
          />
        </div>
      </div>
    </div>
  );
};

export default StaffTrainingDetailPage;
