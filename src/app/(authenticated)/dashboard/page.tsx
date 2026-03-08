"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import SOPCard from "@/components/sop/SOPCard";
import type { SOP, Category } from "@/lib/types";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  TrendingUp,
  Users,
  FileText,
  ArrowRight,
} from "lucide-react";

interface DashboardStats {
  totalSops: number;
  publishedSops: number;
  totalCategories: number;
  myCompletedSops: number;
}

const DashboardPage = () => {
  const { profile, isAdmin, supabase, loading: authLoading } = useAuth();
  const [recentSops, setRecentSops] = useState<SOP[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSops: 0,
    publishedSops: 0,
    totalCategories: 0,
    myCompletedSops: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      try {
        const [sopsRes, categoriesRes, totalRes, publishedRes] = await Promise.all([
          supabase
            .from("sops")
            .select("*, category:categories(name, emoji)")
            .eq("status", "published")
            .order("updated_at", { ascending: false })
            .limit(6),
          supabase.from("categories").select("*").order("sort_order"),
          supabase.from("sops").select("*", { count: "exact", head: true }),
          supabase.from("sops").select("*", { count: "exact", head: true }).eq("status", "published"),
        ]);

        setRecentSops(sopsRes.data || []);
        setCategories(categoriesRes.data || []);

        setStats({
          totalSops: totalRes.count || 0,
          publishedSops: publishedRes.count || 0,
          totalCategories: categoriesRes.data?.length || 0,
          myCompletedSops: 0,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, supabase]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {getGreeting()}, {profile?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {isAdmin
            ? "Here's an overview of your cafe's SOPs"
            : "Ready to follow today's procedures?"}
        </p>
      </div>

      {/* Stats */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            emoji="📋"
            label="Total SOPs"
            value={stats.totalSops}
            color="bg-blue-50"
          />
          <StatCard
            emoji="✅"
            label="Published"
            value={stats.publishedSops}
            color="bg-green-50"
          />
          <StatCard
            emoji="🏷️"
            label="Categories"
            value={stats.totalCategories}
            color="bg-purple-50"
          />
          <StatCard
            emoji="📝"
            label="Drafts"
            value={stats.totalSops - stats.publishedSops}
            color="bg-orange-50"
          />
        </div>
      )}

      {/* Quick Actions */}
      {isAdmin && (
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/sops/new"
            className="inline-flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New SOP
          </Link>
          <Link
            href="/admin/sops"
            className="inline-flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Manage SOPs
          </Link>
          <Link
            href="/admin/categories"
            className="inline-flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            🏷️ Categories
          </Link>
        </div>
      )}

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Browse by Category</h2>
          <Link
            href="/sops"
            className="text-sm text-amber-600 font-medium hover:text-amber-700 flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/sops?category=${cat.id}`}
              className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-amber-200 transition-all text-center group"
            >
              <span className="text-3xl block mb-2">{cat.emoji}</span>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-amber-700 transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent SOPs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Recent SOPs</h2>
          <Link
            href="/sops"
            className="text-sm text-amber-600 font-medium hover:text-amber-700 flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {recentSops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSops.map((sop) => (
              <SOPCard key={sop.id} sop={sop} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No SOPs yet</p>
            {isAdmin && (
              <Link
                href="/admin/sops/new"
                className="inline-flex items-center gap-2 mt-3 text-amber-600 font-medium text-sm"
              >
                <Plus className="w-4 h-4" /> Create your first SOP
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({
  emoji,
  label,
  value,
  color,
}: {
  emoji: string;
  label: string;
  value: number;
  color: string;
}) => (
  <div className={`${color} rounded-2xl p-4`}>
    <span className="text-2xl">{emoji}</span>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    <p className="text-xs text-gray-500 font-medium">{label}</p>
  </div>
);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default DashboardPage;
