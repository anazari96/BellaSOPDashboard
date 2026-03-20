"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { FileText, Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AcceptTermsPage() {
  const { user, supabase, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ terms_accepted: true })
        .eq("id", user.id);

      if (updateError) throw updateError;

      router.push("/dashboard");
      router.refresh(); // Refresh to trigger middleware re-evaluation
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update profile");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-2xl w-full space-y-8">
        <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl flex-shrink-0">
            <FileText className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Terms & Conditions</h1>
            <p className="text-gray-500">Please read and accept the terms to continue</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="prose prose-sm prose-amber max-w-none h-64 overflow-y-auto p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-700">
          <h3>Welcome to the Bella Aurora Cafe SOP Dashboard</h3>
          <p>By accessing and using this system, you agree to the following strict terms and conditions:</p>
          
          <h4>1. Strict Confidentiality & No Data Extraction</h4>
          <p>All Standard Operating Procedures (SOPs), recipes, and training materials contained within this system are highly confidential and are the exclusive property of Bella Aurora Cafe. You must not take the data from this platform anywhere outside of the business. <strong>Taking screenshots, screen recordings, or photos of this platform is strictly prohibited.</strong></p>

          <h4>2. Authorized Access & Location</h4>
          <p>This system is exclusively for the use of active Bella Aurora Cafe staff. Access to the dashboard and its contents should only be utilized while in the cafe for work purposes. Do not share this information with unauthorized individuals or third parties.</p>

          <h4>3. The Only Source of Truth</h4>
          <p>This dashboard is the definitive and <strong>only</strong> source of truth for our operations. You must follow the recipes, procedures, and SOPs outlined exactly as they are written here at all times. Do not rely on past habits, memory, or any other unauthorized recipes.</p>

          <h4>4. Monitoring & Compliance</h4>
          <p>Your interactions with the system, including your login history and training progress, are recorded and monitored by administration to ensure operational compliance and system security.</p>

          <p className="font-medium text-red-600 mt-4">Failure to comply with these terms, including unauthorized data sharing or deviation from the official SOPs, may result in the immediate revocation of access privileges and severe disciplinary action, up to employment termination.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            Decline & Sign Out
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "I have read and accept"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
