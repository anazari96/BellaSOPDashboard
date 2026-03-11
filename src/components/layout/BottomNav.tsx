"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, BarChart3, User, Settings, Library } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

const BottomNav = () => {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const staffLinks = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard, emoji: "🏠" },
    { href: "/sops", label: "SOPs", icon: BookOpen, emoji: "📋" },
    { href: "/presets", label: "Presets", icon: Library, emoji: "📚" },
    { href: "/progress", label: "Progress", icon: BarChart3, emoji: "📊" },
    { href: "/profile", label: "Profile", icon: User, emoji: "👤" },
  ];

  const adminLinks = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard, emoji: "🏠" },
    { href: "/sops", label: "SOPs", icon: BookOpen, emoji: "📋" },
    { href: "/presets", label: "Presets", icon: Library, emoji: "📚" },
    { href: "/admin/sops", label: "Manage", icon: Settings, emoji: "⚙️" },
    { href: "/profile", label: "Profile", icon: User, emoji: "👤" },
  ];

  const links = isAdmin ? adminLinks : staffLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 md:hidden z-50">
      <div className="flex items-center justify-around py-2 px-2 safe-area-bottom">
        {links.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? "text-amber-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className="text-lg">{link.emoji}</span>
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
