"use client";

import Link from "next/link";
import { BookOpen, Users, Tags, GraduationCap, Settings, User, LogOut, ChevronRight, BarChart3 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AdminDashboardPage() {
  const { profile, signOut } = useAuth();

  const adminMenu = [
    {
      title: "Manage SOPs",
      description: "Create, edit, and publish SOPs",
      href: "/admin/sops",
      icon: BookOpen,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Category Management",
      description: "Organize SOPs into categories",
      href: "/admin/categories",
      icon: Tags,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Training Presets",
      description: "Manage structured training paths",
      href: "/admin/presets",
      icon: GraduationCap,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Staff Training & Progress",
      description: "View staff test results and stats",
      href: "/admin/training",
      icon: BarChart3,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      title: "User Approvals",
      description: "Manage staff accounts",
      href: "/admin/users",
      icon: Users,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your operations, staff, and content.
        </p>
      </div>

      <div className="space-y-4">
        {/* Navigation Cards */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {adminMenu.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
                  i !== adminMenu.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
                  <Icon className={`w-6 h-6 ${item.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </Link>
            );
          })}
        </div>

        {/* Account Controls */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mt-6">
          <Link
            href="/profile"
            className="flex items-center gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900">My Profile</h3>
              <p className="text-sm text-gray-500 truncate">{profile?.full_name}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-4 p-4 hover:bg-red-50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-red-600">Sign Out</h3>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
