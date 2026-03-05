"use client";

import { Coffee, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";

const Header = () => {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between md:hidden sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
          <Coffee className="w-5 h-5 text-amber-700" />
        </div>
        <h1 className="font-bold text-gray-900 text-lg">Bella SOP</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
          {profile?.full_name?.charAt(0) || "?"}
        </div>
        <button
          onClick={handleSignOut}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
