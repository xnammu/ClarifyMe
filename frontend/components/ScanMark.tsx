"use client";

import type { CSSProperties } from "react";

/**
 * The one signature visual: a grid of mixed-tone blocks with a scanline
 * sweeping across them - a small literal echo of what the tool does to a
 * pixelated screenshot. Reused as the static looping logomark in the header,
 * and (driven by real `progress` instead of looping) as the progress
 * indicator in ProgressPanel.
 */
interface ScanMarkProps {
  size?: number;
  /** 0-100. When provided, the line position is driven by this instead of looping. */
  progress?: number;
  className?: string;
}

const GRID = 6;
// Deterministic pseudo-noise for the unresolved blocks, so server/client markup matches.
const NOISE = [2, 5, 1, 4, 0, 3, 5, 2, 4, 1, 0, 3, 1, 4, 2, 5, 3, 0, 4, 1, 5, 2, 0, 3, 2, 5, 1, 4, 0, 3, 4, 1, 5, 2, 3, 0];

export function ScanMark({ size = 28, progress, className }: ScanMarkProps) {
  const isLive = typeof progress === "number";
  const cell = size / GRID;
  const clipId = `scanmark-clip-${size}-${isLive ? "live" : "loop"}`;
  const linePosition = isLive ? (size * Math.min(100, Math.max(0, progress ?? 0))) / 100 : 0;
  const sweepStyle = isLive ? undefined : ({ "--sweep-size": `${size}px` } as CSSProperties);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={isLive ? "Processing progress" : "ClarifyMe"}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={size} height={size} rx={size * 0.18} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width={size} height={size} fill="var(--color-panel-raised)" />
        {Array.from({ length: GRID }).map((_, row) =>
          Array.from({ length: GRID }).map((__, col) => {
            const idx = row * GRID + col;
            const shade = 0.15 + (NOISE[idx % NOISE.length] / 5) * 0.35;
            return (
              <rect
                key={`${row}-${col}`}
                x={col * cell}
                y={row * cell}
                width={cell + 0.5}
                height={cell + 0.5}
                fill="var(--color-text-muted)"
                opacity={shade}
              />
            );
          }),
        )}
        {isLive && (
          <rect x={0} y={0} width={size} height={linePosition} fill="var(--color-accent-soft)" />
        )}
        <rect
          x={0}
          y={isLive ? linePosition - 1 : 0}
          width={size}
          height={1.5}
          fill="var(--color-accent)"
          className={isLive ? undefined : "scanmark-sweep"}
          style={sweepStyle}
        />
      </g>
    </svg>
  );
}
