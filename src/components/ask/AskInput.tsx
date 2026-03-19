"use client";

import { useState, useRef } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";

interface AskInputProps {
  onSubmit: (question: string) => Promise<void>;
  isLoading: boolean;
}

export function AskInput({ onSubmit, isLoading }: AskInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    const q = value.trim();
    if (!q || isLoading) return;
    setValue("");
    await onSubmit(q);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const quickExamples = [
    "How do I clean the steam wand?",
    "What's the espresso pull time?",
    "How to greet a customer?",
    "Opening checklist steps?",
  ];

  return (
    <div className="space-y-4">
      {/* Textarea + submit button */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a quick question about any procedure…"
          rows={3}
          className="w-full resize-none rounded-2xl border-2 border-amber-200 bg-white px-4 py-3 pr-14 text-sm text-gray-800 placeholder-gray-400 shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          aria-label="Submit question"
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Quick example chips */}
      <div className="flex flex-wrap gap-2">
        {quickExamples.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setValue(ex);
              textareaRef.current?.focus();
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
          >
            <MessageCircle className="h-3 w-3" />
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
