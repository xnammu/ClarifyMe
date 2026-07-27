"use client";

import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { EngineInfo } from "@/lib/types";

interface EngineMultiSelectProps {
  engines: EngineInfo[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/** Checkbox-based multi-select rather than a fixed "A / B / both" radio - this scales
 * to any number of engines the backend registers, with no frontend change needed. */
export function EngineMultiSelect({ engines, selected, onChange }: EngineMultiSelectProps) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((e) => e !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--color-text)]">Recovery engines</span>
      <div className="grid gap-2 sm:grid-cols-2">
        {engines.map((engine) => {
          const isSelected = selected.includes(engine.id);
          return (
            <Card
              key={engine.id}
              className={`flex cursor-pointer flex-col gap-1.5 p-3 transition-colors ${
                isSelected ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "hover:border-[var(--color-text-muted)]"
              }`}
              onClick={() => toggle(engine.id)}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggle(engine.id)}
                  onClick={(e) => e.stopPropagation()}
                  id={`engine-${engine.id}`}
                />
                <Label htmlFor={`engine-${engine.id}`} className="cursor-pointer font-display" onClick={(e) => e.stopPropagation()}>
                  {engine.name}
                </Label>
              </div>
              <span className="text-xs leading-snug text-[var(--color-text-muted)]">{engine.description}</span>
            </Card>
          );
        })}
      </div>
      {selected.length > 1 && (
        <p className="text-xs text-[var(--color-text-muted)]">
          Running {selected.length} engines - results for each will show side by side.
        </p>
      )}
    </div>
  );
}
