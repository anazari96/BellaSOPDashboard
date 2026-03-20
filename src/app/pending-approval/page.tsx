"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Coffee, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl mx-auto">
          <Coffee className="w-8 h-8 text-amber-700" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Account Pending</h1>
          <p className="text-gray-500">
            Your account has been created successfully, but it needs to be approved by an administrator before you can access the dashboard.
          </p>
          <p className="text-sm text-amber-600 font-medium pt-2">
            Please check back later or contact your manager.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
