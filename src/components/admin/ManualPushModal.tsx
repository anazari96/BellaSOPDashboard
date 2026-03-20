"use client";

import { useState } from "react";
import { X, Send, Loader2, Users, User } from "lucide-react";

interface ManualPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTitle?: string;
}

export default function ManualPushModal({ isOpen, onClose, defaultTitle }: ManualPushModalProps) {
  const [title, setTitle] = useState(defaultTitle ? `Check out SOP: ${defaultTitle}` : "New Update");
  const [message, setMessage] = useState("Please review the latest updates we have published.");
  const [target, setTarget] = useState<"all" | "user">("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/notifications/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          targetUserId: target === "user" ? targetUserId : "all",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      setResult({ success: true, msg: `Sent successfully to ${data.count} device(s).` });
      setTimeout(() => {
        onClose();
        setResult(null);
      }, 3000);
    } catch (err: any) {
      setResult({ success: false, msg: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Send Push Notification</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTarget("all")}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    target === "all" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Users size={16} /> All Staff
                </button>
                <button
                  onClick={() => setTarget("user")}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    target === "user" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <User size={16} /> Specific User
                </button>
              </div>
            </div>

            {target === "user" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Paste Supabase User ID"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                />
              </div>
            )}

            {result && (
              <div className={`p-3 rounded-lg text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {result.msg}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || (target === "user" && !targetUserId)}
            className="flex items-center gap-2 px-4 py-2 font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Send Notification
          </button>
        </div>
      </div>
    </div>
  );
}
