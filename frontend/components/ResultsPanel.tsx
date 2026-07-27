"use client";

import { resolveApiUrl } from "@/lib/api";
import type { EngineResultOut } from "@/lib/types";

import { ImageCompare } from "./ImageCompare";
import { MetadataChips } from "./MetadataChips";
import { TextResult } from "./TextResult";

interface ResultsPanelProps {
  originalPreviewUrl: string;
  results: EngineResultOut[];
  engineNames: Record<string, string>;
}

export function ResultsPanel({ originalPreviewUrl, results, engineNames }: ResultsPanelProps) {
  const downloadableUrls = results
    .filter((r) => r.result_type === "image" && r.image_url)
    .map((r) => resolveApiUrl(r.image_url as string));

  return (
    <div className="flex flex-col gap-4">
      {results.map((result) => (
        <div key={result.engine} className="flex flex-col gap-2">
          <span className="font-display text-sm font-medium text-[var(--color-text)]">
            {engineNames[result.engine] ?? result.engine}
          </span>

          {result.result_type === "error" && (
            <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-panel)] p-3 text-sm text-[var(--color-danger)]">
              {result.error ?? "This engine failed unexpectedly."}
            </div>
          )}

          {result.result_type === "image" && result.image_url && (
            <ImageCompare originalUrl={originalPreviewUrl} resultUrl={resolveApiUrl(result.image_url)} />
          )}

          {result.result_type === "text" && result.text !== undefined && result.text !== null && (
            <TextResult text={result.text} />
          )}

          <MetadataChips metadata={result.metadata} />
        </div>
      ))}

      {downloadableUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {downloadableUrls.map((url) => (
            <a
              key={url}
              href={url}
              download
              className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:border-[var(--color-accent)]"
            >
              Download {url.split("/").pop()}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
