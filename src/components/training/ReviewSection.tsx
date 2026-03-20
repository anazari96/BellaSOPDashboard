"use client";

import { BookOpen, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReviewSectionProps {
  sopTitle: string;
  reviewContent: string;
  onReady: () => void;
}

const ReviewSection = ({ sopTitle, reviewContent, onReady }: ReviewSectionProps) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Review Material</h2>
          <p className="text-sm text-gray-500">{sopTitle}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div
          className="prose prose-sm max-w-none text-gray-700 leading-relaxed
            prose-headings:text-gray-900 prose-headings:font-bold
            prose-strong:text-gray-900
            prose-li:text-gray-700
            prose-p:text-gray-700"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              ul: ({ ...props }) => <ul className="list-disc ml-5 space-y-1 my-3" {...props} />,
              ol: ({ ...props }) => <ol className="list-decimal ml-5 space-y-1 my-3" {...props} />,
              li: ({ ...props }) => <li className="text-gray-700" {...props} />,
            }}
          >
            {reviewContent}
          </ReactMarkdown>
        </div>
      </div>

      <button
        onClick={onReady}
        className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white py-4 rounded-xl font-semibold text-sm hover:bg-amber-700 transition-colors"
      >
        I&apos;m Ready for the Quiz
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ReviewSection;
