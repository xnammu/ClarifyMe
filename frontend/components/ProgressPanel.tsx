"use client";

import { ScanMark } from "./ScanMark";

interface ProgressPanelProps {
  stage: string;
  progress: number;
}

export function ProgressPanel({ stage, progress }: ProgressPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-12 text-center">
      <ScanMark size={40} progress={progress} />
      <div className="flex flex-col gap-1">
        <span className="font-display text-sm font-medium text-[var(--color-text)]">
          {stage}
        </span>
        <span className="font-mono text-xs text-[var(--color-text-muted)]">
          {progress}%
        </span>
      </div>
      <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-[var(--color-panel-raised)]">
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
