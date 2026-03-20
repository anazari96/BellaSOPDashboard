"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Profile } from "@/lib/types";
import { CheckCircle, Shield, User, XCircle, Search, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const { supabase, isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Failed to load users");
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const toggleApproval = async (userId: string, currentStatus: boolean) => {
    setUpdatingId(userId);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_approved: !currentStatus })
      .eq("id", userId);

    if (updateError) {
      console.error(updateError);
      setError("Failed to update user approval status");
    } else {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === userId ? { ...p, is_approved: !currentStatus } : p
        )
      );
    }
    setUpdatingId(null);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-red-500">
        You do not have permission to view this page.
      </div>
    );
  }

  const filteredProfiles = profiles.filter((p) =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User className="w-6 h-6 text-amber-600" />
            Manage Users
          </h1>
          <p className="text-gray-500 mt-1">Approve or revoke access for staff members.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100/80">
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Role</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Terms Accepted</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80">
              {loading && profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{profile.full_name || "Unnamed"}</div>
                      <div className="text-sm text-gray-500 truncate max-w-[200px]" title={profile.id}>ID: <span className="font-mono text-xs">{profile.id.substring(0, 8)}...</span></div>
                    </td>
                    <td className="px-6 py-4">
                      {profile.role === "admin" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                          <Shield className="w-3.5 h-3.5" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200/50">
                          Staff
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {profile.is_approved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200/50">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/50">
                          <RefreshCw className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {profile.terms_accepted ? (
                        <span className="text-green-600 font-medium text-sm">Yes</span>
                      ) : (
                        <span className="text-gray-400 text-sm">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {profile.role !== "admin" && (
                        <button
                          onClick={() => toggleApproval(profile.id, profile.is_approved)}
                          disabled={updatingId === profile.id}
                          className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                            profile.is_approved
                              ? "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                        >
                          {updatingId === profile.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : profile.is_approved ? (
                            <>
                              <XCircle className="w-4 h-4 mr-1.5" />
                              Revoke
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1.5" />
                              Approve
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
