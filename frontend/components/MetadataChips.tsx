"use client";

function formatKey(key: string): string {
  return key.replace(/_/g, " ");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(3);
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function MetadataChips({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="rounded-full border border-[var(--color-border)] bg-[var(--color-panel-raised)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-text-muted)]"
        >
          {formatKey(key)}: {formatValue(value)}
        </span>
      ))}
    </div>
  );
}
