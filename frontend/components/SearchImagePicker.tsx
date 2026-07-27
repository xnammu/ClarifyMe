"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropzone } from "@/components/Dropzone";
import { useSearchImages } from "@/hooks/useApi";
import { resolveApiUrl } from "@/lib/api";

export type SearchImageSelection = { kind: "bundled"; id: string } | { kind: "file"; file: File } | null;

interface SearchImagePickerProps {
  label: string;
  value: SearchImageSelection;
  onChange: (value: SearchImageSelection) => void;
}

/** Bundled search images are opt-in, clearly-labeled choices (with a "note" on which
 * font/editor/OS they actually match) rather than a silent best-effort fallback - a
 * mismatched one gives confidently wrong output with no error, so the choice needs
 * to be visible. */
export function SearchImagePicker({ label, value, onChange }: SearchImagePickerProps) {
  const { data: searchImages, isLoading } = useSearchImages();
  const [mode, setMode] = useState<"bundled" | "custom">(value?.kind === "file" ? "custom" : "bundled");

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "bundled" ? "default" : "outline"}
          onClick={() => setMode("bundled")}
        >
          Use a bundled one
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "custom" ? "default" : "outline"}
          onClick={() => setMode("custom")}
        >
          Upload my own
        </Button>
      </div>

      {mode === "bundled" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {isLoading && <span className="text-xs text-[var(--color-text-muted)]">Loading...</span>}
          {searchImages?.map((img) => {
            const isSelected = value?.kind === "bundled" && value.id === img.id;
            return (
              <Card
                key={img.id}
                onClick={() => onChange({ kind: "bundled", id: img.id })}
                className={`flex cursor-pointer items-center gap-2 p-2 transition-colors ${
                  isSelected ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "hover:border-[var(--color-text-muted)]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveApiUrl(img.preview_url)}
                  alt={img.label}
                  className="h-10 w-20 shrink-0 rounded bg-white object-cover [image-rendering:pixelated]"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-[var(--color-text)]">{img.label}</span>
                  <span className="text-[11px] leading-snug text-[var(--color-text-muted)]">{img.note}</span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Dropzone
          file={value?.kind === "file" ? value.file : null}
          onChange={(file) => onChange(file ? { kind: "file", file } : null)}
        />
      )}
    </div>
  );
}
