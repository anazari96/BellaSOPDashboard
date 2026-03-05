"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Upload, X, Image, Video, Loader2 } from "lucide-react";
import type { MediaType } from "@/lib/types";

interface MediaItem {
  id?: string;
  media_url: string;
  media_type: MediaType;
  caption: string;
}

interface MediaUploaderProps {
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
}

const MediaUploader = ({ media, onChange }: MediaUploaderProps) => {
  const { supabase } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newMedia: MediaItem[] = [];

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const ext = file.name.split(".").pop();
      const filePath = `sop-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("sop-media")
        .upload(filePath, file);

      if (!error) {
        const { data } = supabase.storage.from("sop-media").getPublicUrl(filePath);
        newMedia.push({
          media_url: data.publicUrl,
          media_type: isVideo ? "video" : "image",
          caption: "",
        });
      }
    }

    onChange([...media, ...newMedia]);
    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    onChange(media.filter((_, i) => i !== index));
  };

  const updateCaption = (index: number, caption: string) => {
    const updated = [...media];
    updated[index] = { ...updated[index], caption };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {media.map((item, index) => (
        <div
          key={index}
          className="flex items-start gap-3 bg-gray-50 rounded-xl p-3"
        >
          <div className="w-20 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
            {item.media_type === "image" ? (
              <img
                src={item.media_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={item.caption}
              onChange={(e) => updateCaption(index, e.target.value)}
              placeholder="Add a caption..."
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-100 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              {item.media_type === "image" ? (
                <Image className="w-3 h-3" />
              ) : (
                <Video className="w-3 h-3" />
              )}
              {item.media_type}
            </p>
          </div>
          <button
            onClick={() => removeMedia(index)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-amber-300 hover:bg-amber-50/50 transition-all disabled:opacity-50"
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Upload className="w-4 h-4" />
            Upload image or video
          </div>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
};

export default MediaUploader;
