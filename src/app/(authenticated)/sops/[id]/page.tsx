"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import StepViewer from "@/components/sop/StepViewer";
import ImportanceBadge from "@/components/sop/ImportanceBadge";
import type { SOP, SOPStep, StaffProgress } from "@/lib/types";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

const SOPDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, supabase, loading: authLoading } = useAuth();
  const [sop, setSop] = useState<SOP | null>(null);
  const [steps, setSteps] = useState<SOPStep[]>([]);
  const [progress, setProgress] = useState<StaffProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const fetchSop = async () => {
      const sopId = params.id as string;
      try {
        const [sopRes, stepsRes, progressRes] = await Promise.all([
          supabase
            .from("sops")
            .select("*, category:categories(name, emoji)")
            .eq("id", sopId)
            .single(),
          supabase
            .from("sop_steps")
            .select("*, media:step_media(*)")
            .eq("sop_id", sopId)
            .order("step_number"),
          user
            ? supabase
                .from("staff_progress")
                .select("*")
                .eq("sop_id", sopId)
                .eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);

        if (sopRes.data) setSop(sopRes.data);
        if (stepsRes.data) setSteps(stepsRes.data);
        if (progressRes.data) setProgress(progressRes.data);
      } catch (err) {
        console.error("Fetch SOP error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSop();
  }, [params.id, user, supabase, authLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl block mb-4">😕</span>
        <p className="text-gray-500 font-medium">SOP not found</p>
        <button
          onClick={() => router.push("/sops")}
          className="mt-4 text-amber-600 text-sm font-medium"
        >
          Browse SOPs
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* SOP Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{sop.category?.emoji || "📋"}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <ImportanceBadge importance={sop.importance} size="md" />
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                {sop.category?.name}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              {sop.title}
            </h1>
            {sop.description && (
              <p className="text-gray-500 text-sm">{sop.description}</p>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              Updated {formatDate(sop.updated_at)}
              <span>·</span>
              <span>{steps.length} steps</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step Viewer */}
      {steps.length > 0 && user ? (
        <StepViewer
          sopId={sop.id}
          steps={steps}
          initialProgress={progress}
          userId={user.id}
        />
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <span className="text-4xl block mb-3">📝</span>
          <p className="text-gray-500">No steps added yet</p>
        </div>
      )}
    </div>
  );
};

export default SOPDetailPage;
