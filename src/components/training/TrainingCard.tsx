"use client";

import Link from "next/link";
import { GraduationCap, Clock, ArrowRight, BookOpen } from "lucide-react";
import type { TrainingSession } from "@/lib/types";

interface TrainingCardProps {
  session: TrainingSession;
}

const TrainingCard = ({ session }: TrainingCardProps) => {
  const isInProgress = session.status === "in_progress";

  return (
    <div className="bg-linear-to-br from-amber-50 via-orange-50 to-amber-50 rounded-2xl border-2 border-amber-200 p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">
              {isInProgress ? "Continue Training" : "Today's Training"}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              ~10 min
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-gray-700 truncate">
            {session.sop?.title || "Training Session"}
          </p>
        </div>

        {isInProgress && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>In progress</span>
              <span>
                {session.correct_answers}/{session.total_questions} answered
              </span>
            </div>
            <div className="w-full bg-amber-100 rounded-full h-2">
              <div
                className="bg-amber-600 rounded-full h-2 transition-all"
                style={{
                  width: `${
                    session.total_questions > 0
                      ? (session.correct_answers / session.total_questions) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        <Link
          href={`/training/${session.id}`}
          className="flex items-center justify-center gap-2 w-full bg-amber-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-amber-700 transition-colors"
        >
          {isInProgress ? "Continue" : "Start Training"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default TrainingCard;
