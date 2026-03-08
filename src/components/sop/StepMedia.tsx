"use client";

import type { StepMedia as StepMediaType } from "@/lib/types";

interface StepMediaProps {
  media: StepMediaType[];
}

const StepMedia = ({ media }: StepMediaProps) => {
  if (!media || media.length === 0) return null;

  return (
    <div className="space-y-3 mt-4">
      {media.map((item) => (
        <div key={item.id} className="rounded-xl overflow-hidden bg-gray-100">
          {item.media_type === "image" ? (
            <img
              src={item.media_url}
              alt={item.caption || "Step illustration"}
              className="w-full h-auto object-cover"
            />
          ) : (
            <video
              src={item.media_url}
              controls
              className="w-full h-auto"
              preload="metadata"
            >
              Your browser does not support video playback.
            </video>
          )}
          {item.caption && (
            <p className="text-xs text-gray-500 px-3 py-2 bg-gray-50">
              📸 {item.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default StepMedia;
