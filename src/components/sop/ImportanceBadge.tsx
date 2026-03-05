"use client";

import { IMPORTANCE_CONFIG, type SOPImportance } from "@/lib/types";

interface ImportanceBadgeProps {
  importance: SOPImportance;
  size?: "sm" | "md";
}

const ImportanceBadge = ({ importance, size = "sm" }: ImportanceBadgeProps) => {
  const config = IMPORTANCE_CONFIG[importance];

  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full font-medium ${config.bg} ${config.color} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      <span>{config.emoji}</span>
      {config.label}
    </span>
  );
};

export default ImportanceBadge;
