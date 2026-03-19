"use client";

import Link from "next/link";
import { ExternalLink, BookOpen } from "lucide-react";
import type { SOPReference } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AnswerCardProps {
  question: string;
  answer: string;
  sopReferences: SOPReference[];
}

export function AnswerCard({ question, answer, sopReferences }: AnswerCardProps) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
      {/* Question echo */}
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-amber-500">Your question</p>
      <p className="mb-4 text-sm font-medium text-gray-700 italic">"{question}"</p>

      {/* Answer */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow-inner">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            ul: ({ ...props }) => <ul className="list-disc ml-5 space-y-1 my-3" {...props} />,
            ol: ({ ...props }) => <ol className="list-decimal ml-5 space-y-1 my-3" {...props} />,
            li: ({ ...props }) => <li className="text-gray-700" {...props} />,
          }}
        >
          {answer}
        </ReactMarkdown>
      </div>

      {/* SOP References */}
      {sopReferences.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
            <BookOpen className="h-3.5 w-3.5" />
            Referenced SOPs
          </p>
          <div className="flex flex-wrap gap-2">
            {sopReferences.map((ref) => (
              <Link
                key={ref.sop_id}
                href={`/sops/${ref.sop_id}`}
                className="group flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-200 hover:text-amber-900"
              >
                <span>{ref.emoji ?? "📋"}</span>
                <span>{ref.title}</span>
                <ExternalLink className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
