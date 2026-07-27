"use client";

import { useState } from "react";

interface TextResultProps {
  text: string;
}

export function TextResult({ text }: TextResultProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permissions can silently fail in some browsers/contexts; not worth surfacing an error for.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">Recovered text</span>
        <button type="button" onClick={handleCopy} className="text-xs text-[var(--color-accent)] hover:underline">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="break-all rounded bg-[var(--color-panel-raised)] px-3 py-2 font-mono text-lg text-[var(--color-text)]">
        {text || "(no text recovered)"}
      </code>
    </div>
  );
}
