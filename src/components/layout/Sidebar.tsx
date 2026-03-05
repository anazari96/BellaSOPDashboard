"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

const Sidebar = () => {
  const pathname = usePathname();
  const { isAdmin, profile, signOut } = useAuth();

  const mainLinks = [
    { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
    { href: "/sops", label: "Browse SOPs", emoji: "📋" },
  ];

  const staffLinks = [
    { href: "/progress", label: "My Progress", emoji: "📊" },
  ];

  const adminLinks = [
    { href: "/admin/sops", label: "Manage SOPs", emoji: "⚙️" },
    { href: "/admin/sops/new", label: "Create SOP", emoji: "✏️" },
    { href: "/admin/categories", label: "Categories", emoji: "🏷️" },
  ];

  const NavLink = ({ href, label, emoji }: { href: string; label: string; emoji: string }) => {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? "bg-amber-100 text-amber-800"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <span className="text-base">{emoji}</span>
        {label}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 h-screen sticky top-0">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Coffee className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900">Bella SOP</h1>
          <p className="text-xs text-gray-400">Cafe Operations</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        <div className="space-y-1">
          {mainLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </div>

        {!isAdmin && (
          <div className="space-y-1">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              My Stuff
            </p>
            {staffLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="space-y-1">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Admin
            </p>
            {adminLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
            {profile?.full_name?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.full_name}
            </p>
            <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
