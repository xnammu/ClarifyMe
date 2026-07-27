"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/Dropzone";
import type { ImageSource } from "@/lib/types";

interface ImageSourceInputProps {
  label: string;
  helpText?: string;
  value: ImageSource | null;
  onChange: (value: ImageSource | null) => void;
}

/** URL images are fetched server-side (see backend api/url_fetch.py) rather than via
 * a browser fetch() - a client-side fetch of an arbitrary third-party image URL fails
 * with a CORS error for most image hosts, so this is a correctness fix, not just a
 * different UI. */
export function ImageSourceInput({ label, helpText, value, onChange }: ImageSourceInputProps) {
  const [mode, setMode] = useState<"file" | "url">(value?.kind === "url" ? "url" : "file");
  const [urlDraft, setUrlDraft] = useState(value?.kind === "url" ? value.url : "");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--color-text)]">{label}</label>
        <div className="flex gap-1 text-xs">
          <Button
            type="button"
            size="sm"
            variant={mode === "file" ? "default" : "ghost"}
            onClick={() => {
              setMode("file");
              onChange(null);
            }}
          >
            Upload
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "url" ? "default" : "ghost"}
            onClick={() => {
              setMode("url");
              onChange(null);
            }}
          >
            From URL
          </Button>
        </div>
      </div>

      {mode === "file" ? (
        <Dropzone
          helpText={helpText}
          file={value?.kind === "file" ? value.file : null}
          onChange={(file) => onChange(file ? { kind: "file", file } : null)}
        />
      ) : (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://example.com/screenshot.png"
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => urlDraft.trim() && onChange({ kind: "url", url: urlDraft.trim() })}
          >
            Use URL
          </Button>
        </div>
      )}
      {mode === "url" && value?.kind === "url" && (
        <span className="text-xs text-[var(--color-text-muted)]">Will be fetched by the server: {value.url}</span>
      )}
    </div>
  );
}
