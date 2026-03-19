"use client";

import { useState, useEffect } from "react";
import { Sparkles, History, Clock } from "lucide-react";
import { AskInput } from "@/components/ask/AskInput";
import { AnswerCard } from "@/components/ask/AnswerCard";
import { supabaseClient } from "@/lib/supabase/client";
import type { SOPReference, QALogEntry } from "@/lib/types";

interface AskResult {
  question: string;
  answer: string;
  sopReferences: SOPReference[];
}

export default function AskPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QALogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load recent questions on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const { data } = await supabaseClient
          .from("sop_qa_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);
        setHistory((data as QALogEntry[]) ?? []);
      } catch {
        // History is non-critical — silently ignore
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHistory();
  }, []);

  const handleAsk = async (question: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/ask-sop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Something went wrong. Please try again.");
      }

      const answerResult: AskResult = {
        question,
        answer: json.answer,
        sopReferences: json.sopReferences ?? [],
      };
      setResult(answerResult);

      // Refresh history in background
      const { data } = await supabaseClient
        .from("sop_qa_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setHistory((data as QALogEntry[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const reaskFromHistory = (entry: QALogEntry) => {
    // Pre-populate and fire the existing result
    setResult({
      question: entry.question,
      answer: entry.answer,
      sopReferences: entry.sop_references,
    });
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200 flex-shrink-0">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ask Anything</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Quick SOP answers for the busy café floor — just ask.
          </p>
        </div>
      </div>

      {/* Input */}
      <AskInput onSubmit={handleAsk} isLoading={isLoading} />

      {/* Loading skeleton */}
      {isLoading && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 animate-pulse space-y-3">
          <div className="h-3 bg-amber-200 rounded-full w-24" />
          <div className="h-4 bg-amber-100 rounded-full w-3/4" />
          <div className="h-20 bg-white rounded-xl" />
          <div className="flex gap-2">
            <div className="h-7 w-24 bg-amber-200 rounded-full" />
            <div className="h-7 w-20 bg-amber-200 rounded-full" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Answer */}
      {result && !isLoading && (
        <AnswerCard
          question={result.question}
          answer={result.answer}
          sopReferences={result.sopReferences}
        />
      )}

      {/* Recent questions */}
      {!historyLoading && history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <History className="w-4 h-4" />
            Recent Questions
          </div>
          <div className="space-y-2">
            {history.map((entry) => (
              <button
                key={entry.id}
                onClick={() => reaskFromHistory(entry)}
                className="w-full text-left rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:border-amber-200 hover:bg-amber-50 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-700 font-medium group-hover:text-amber-800 line-clamp-1">
                    {entry.question}
                  </p>
                  <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
                </div>
                {entry.sop_references.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {entry.sop_references.slice(0, 3).map((ref) => (
                      <span
                        key={ref.sop_id}
                        className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5"
                      >
                        {ref.emoji ?? "📋"} {ref.title}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
