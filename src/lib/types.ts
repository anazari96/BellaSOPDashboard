export type UserRole = "admin" | "staff";
export type SOPImportance = "critical" | "high" | "medium" | "low";
export type SOPStatus = "draft" | "published";
export type MediaType = "image" | "video";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface SOP {
  id: string;
  title: string;
  description: string | null;
  category_id: string;
  importance: SOPImportance;
  status: SOPStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  steps?: SOPStep[];
}

export interface SOPStep {
  id: string;
  sop_id: string;
  step_number: number;
  title: string;
  content: string;
  tip: string | null;
  warning: string | null;
  created_at: string;
  media?: StepMedia[];
}

export interface StepMedia {
  id: string;
  step_id: string;
  media_url: string;
  media_type: MediaType;
  caption: string | null;
  sort_order: number;
}

export interface StaffProgress {
  id: string;
  user_id: string;
  sop_id: string;
  step_id: string;
  completed: boolean;
  completed_at: string | null;
}

export const IMPORTANCE_CONFIG: Record<
  SOPImportance,
  { label: string; emoji: string; color: string; bg: string }
> = {
  critical: {
    label: "Critical",
    emoji: "🔴",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  high: {
    label: "High",
    emoji: "🟠",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
  },
  medium: {
    label: "Medium",
    emoji: "🟡",
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
  },
  low: {
    label: "Low",
    emoji: "🟢",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
};
