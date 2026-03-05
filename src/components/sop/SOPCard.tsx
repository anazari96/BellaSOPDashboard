"use client";

import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";
import ImportanceBadge from "./ImportanceBadge";
import ProgressBar from "./ProgressBar";
import type { SOP } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface SOPCardProps {
  sop: SOP & { category?: { name: string; emoji: string } };
  completedSteps?: number;
  totalSteps?: number;
}

const SOPCard = ({ sop, completedSteps, totalSteps }: SOPCardProps) => {
  return (
    <Link href={`/sops/${sop.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-amber-200 transition-all group cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <span className="text-2xl">{sop.category?.emoji || "📋"}</span>
          <ImportanceBadge importance={sop.importance} />
        </div>

        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-amber-700 transition-colors line-clamp-2">
          {sop.title}
        </h3>

        {sop.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
            {sop.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          <span className="bg-gray-100 px-2 py-0.5 rounded-md">
            {sop.category?.name}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(sop.updated_at)}
          </span>
        </div>

        {totalSteps !== undefined && totalSteps > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <ProgressBar
              completed={completedSteps || 0}
              total={totalSteps}
            />
          </div>
        )}

        <div className="flex items-center justify-end mt-2 text-amber-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View SOP <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </Link>
  );
};

export default SOPCard;
