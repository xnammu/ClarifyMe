"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ClipboardEvent, DragEvent } from "react";

interface DropzoneProps {
  label?: string;
  helpText?: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

export function Dropzone({ label, helpText, file, onChange }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const acceptFile = useCallback(
    (candidate: File | undefined | null) => {
      if (candidate && candidate.type.startsWith("image/")) {
        onChange(candidate);
      }
    },
    [onChange],
  );

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(event.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) {
      acceptFile(item.getAsFile());
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={`group relative flex min-h-[9rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
          isDragging
            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
            : "border-[var(--color-border)] bg-[var(--color-panel)] hover:border-[var(--color-text-muted)]"
        }`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`${label} preview`}
            className="max-h-32 rounded [image-rendering:pixelated] object-contain"
          />
        ) : (
          <>
            <span className="text-sm text-[var(--color-text-muted)]">
              Drop an image, click to browse, or paste from clipboard
            </span>
            {helpText && <span className="text-xs text-[var(--color-text-muted)]">{helpText}</span>}
          </>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
      </div>
      {file && (
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-2 shrink-0 text-[var(--color-danger)] hover:underline"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
