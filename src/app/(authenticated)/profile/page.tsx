"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogOut, Loader2, Save, User } from "lucide-react";

const ProfilePage = () => {
  const { profile, user, signOut, supabase } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user || !fullName.trim()) return;
    setSaving(true);

    await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile 👤</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl font-bold text-amber-700">
            {profile?.full_name?.charAt(0) || "?"}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">
              {profile?.full_name}
            </h2>
            <p className="text-sm text-gray-500 capitalize flex items-center gap-1">
              {profile?.role === "admin" ? "🛡️" : "👤"} {profile?.role}
            </p>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm"
          />
        </div>

        {/* Full name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !fullName.trim()}
          className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>✅ Saved!</>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>

        <hr className="border-gray-100" />

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 text-red-600 py-3 rounded-xl font-medium border border-red-200 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
