"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertTriangle,
  Bold,
  List,
  Type,
  Youtube,
} from "lucide-react";
import MediaUploader from "./MediaUploader";
import type { MediaType } from "@/lib/types";

export interface StepData {
  id: string;
  title: string;
  content: string;
  tip: string;
  warning: string;
  video_url?: string | null;
  media: { id?: string; media_url: string; media_type: MediaType; caption: string }[];
  linked_sop_id?: string | null;
  linked_sop?: { id: string; title: string; category?: { name: string; emoji: string } };
}

interface StepEditorProps {
  steps: StepData[];
  onChange: (steps: StepData[]) => void;
  currentSopId?: string;
  linkedSopOptions?: { id: string; title: string; category?: { name: string; emoji: string } }[];
}

const SortableStep = ({
  step,
  index,
  onUpdate,
  onRemove,
  linkedSopOptions,
  currentSopId,
}: {
  step: StepData;
  index: number;
  onUpdate: (id: string, data: Partial<StepData>) => void;
  onRemove: (id: string) => void;
  linkedSopOptions: { id: string; title: string; category?: { name: string; emoji: string } }[];
  currentSopId?: string;
}) => {
  const [expanded, setExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const insertMarkdown = (type: "bold" | "list" | "heading") => {
    const textarea = document.getElementById(`step-content-${step.id}`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    let newText = "";
    let newCursorPos = start;

    switch (type) {
      case "bold":
        newText = `${before}**${selected || "bold text"}**${after}`;
        newCursorPos = start + (selected ? selected.length + 4 : 11);
        break;
      case "list":
        const listText = selected || "item";
        newText = `${before}\n- ${listText}\n${after}`;
        newCursorPos = start + listText.length + 4;
        break;
      case "heading":
        newText = `${before}### ${selected || "Heading"}\n${after}`;
        newCursorPos = start + (selected ? selected.length + 4 : 11);
        break;
    }

    onUpdate(step.id, { content: newText });

    // Focus back and set cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <button
          {...attributes}
          {...listeners}
          className="touch-none text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5" />
        </button>
        <span className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
          {index + 1}
        </span>
        <input
          type="text"
          value={step.title}
          onChange={(e) => onUpdate(step.id, { title: e.target.value })}
          placeholder="Step title..."
          className="flex-1 font-medium text-gray-900 bg-transparent outline-none placeholder-gray-400"
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          {expanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
        <button
          onClick={() => onRemove(step.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-600">
                Instructions
              </label>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => insertMarkdown("bold")}
                  className="p-1 hover:bg-white hover:shadow-xs rounded transition-all text-gray-500 hover:text-gray-900"
                  title="Bold (**text**)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("heading")}
                  className="p-1 hover:bg-white hover:shadow-xs rounded transition-all text-gray-500 hover:text-gray-900"
                  title="Heading (### text)"
                >
                  <Type className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("list")}
                  className="p-1 hover:bg-white hover:shadow-xs rounded transition-all text-gray-500 hover:text-gray-900"
                  title="List (- item)"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <textarea
              id={`step-content-${step.id}`}
              value={step.content}
              onChange={(e) => onUpdate(step.id, { content: e.target.value })}
              placeholder="Describe what to do in this step... Markdown is supported."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm resize-none text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-blue-600 mb-1.5">
              <Lightbulb className="w-4 h-4" />
              Pro Tip (optional)
            </label>
            <input
              type="text"
              value={step.tip}
              onChange={(e) => onUpdate(step.id, { tip: e.target.value })}
              placeholder="Add a helpful tip..."
              className="w-full px-4 py-2.5 rounded-xl border border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-blue-50/50 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-red-600 mb-1.5">
              <AlertTriangle className="w-4 h-4" />
              Warning (optional)
            </label>
            <input
              type="text"
              value={step.warning}
              onChange={(e) => onUpdate(step.id, { warning: e.target.value })}
              placeholder="Add a safety warning or caution..."
              className="w-full px-4 py-2.5 rounded-xl border border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm bg-red-50/50 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-amber-700 mb-1.5">
              <Youtube className="w-4 h-4" />
              YouTube Video URL (optional)
            </label>
            <input
              type="text"
              value={step.video_url ?? ""}
              onChange={(e) => onUpdate(step.id, { video_url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Link to another SOP (optional)
            </label>
            <select
              value={step.linked_sop_id ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate(step.id, {
                  linked_sop_id: val ? val : null,
                  linked_sop: val
                    ? linkedSopOptions.find((o) => o.id === val) ?? undefined
                    : undefined,
                });
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm text-gray-900 bg-white"
            >
              <option value="">None</option>
              {linkedSopOptions
                .filter((o) => o.id !== currentSopId)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.category?.emoji} {o.title}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              📸 Media
            </label>
            <MediaUploader
              media={step.media}
              onChange={(media) => onUpdate(step.id, { media })}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const StepEditor = ({
  steps,
  onChange,
  currentSopId,
  linkedSopOptions = [],
}: StepEditorProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addStep = () => {
    const newStep: StepData = {
      id: `temp-${Date.now()}`,
      title: "",
      content: "",
      tip: "",
      warning: "",
      video_url: null,
      media: [],
      linked_sop_id: null,
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (id: string, data: Partial<StepData>) => {
    onChange(
      steps.map((s) => (s.id === id ? { ...s, ...data } : s))
    );
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) return;
    onChange(steps.filter((s) => s.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    onChange(arrayMove(steps, oldIndex, newIndex));
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={steps.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {steps.map((step, index) => (
            <SortableStep
              key={step.id}
              step={step}
              index={index}
              onUpdate={updateStep}
              onRemove={removeStep}
              linkedSopOptions={linkedSopOptions}
              currentSopId={currentSopId}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addStep}
        className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-amber-300 hover:bg-amber-50/50 transition-all"
      >
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500">
          <Plus className="w-4 h-4" />
          Add Step
        </div>
      </button>
    </div>
  );
};

export default StepEditor;
