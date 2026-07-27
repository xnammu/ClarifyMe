"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { EngineInfo, OptionValues } from "@/lib/types";

interface OptionsFormProps {
  engine: EngineInfo;
  onChange: (values: OptionValues) => void;
}

function buildSchema(engine: EngineInfo) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of engine.options_schema) {
    let schema: z.ZodTypeAny =
      field.type === "number" ? z.coerce.number({ invalid_type_error: `${field.label} must be a number` }) : z.string();
    if (!field.required) {
      schema = schema.optional();
    }
    shape[field.key] = schema;
  }
  return z.object(shape);
}

function defaultValues(engine: EngineInfo): Record<string, string> {
  return Object.fromEntries(engine.options_schema.map((f) => [f.key, f.default != null ? String(f.default) : ""]));
}

/** Renders one engine's option fields, driven entirely by its options_schema - add a
 * field on the backend and it shows up here with no frontend change - validated with
 * a zod schema built dynamically from that same schema. */
export function OptionsForm({ engine, onChange }: OptionsFormProps) {
  const schema = useMemo(() => buildSchema(engine), [engine]);
  const {
    register,
    watch,
    formState: { errors },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: defaultValues(engine),
  });

  const watched = watch();
  // Stringify to avoid re-firing on every render when the object identity changes
  // but the values don't - react-hook-form's watch() returns a new object each call.
  const watchedKey = JSON.stringify(watched);

  useEffect(() => {
    onChange(watched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedKey]);

  if (engine.options_schema.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3 p-3">
      <span className="font-display text-sm font-medium text-[var(--color-text)]">{engine.name} settings</span>
      <div className="grid gap-3 sm:grid-cols-2">
        {engine.options_schema.map((field) => {
          const fieldError = errors[field.key]?.message as string | undefined;
          return (
            <div key={field.key} className="flex flex-col gap-1 text-xs">
              <Label htmlFor={`${engine.id}-${field.key}`} className="text-[var(--color-text-muted)]">
                {field.label}
                {field.required && <span className="text-[var(--color-danger)]"> *</span>}
              </Label>
              {field.type === "select" ? (
                <select
                  id={`${engine.id}-${field.key}`}
                  {...register(field.key)}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-panel-raised)] px-2 py-1.5 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
                >
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${engine.id}-${field.key}`}
                  type={field.type === "number" ? "number" : "text"}
                  {...register(field.key)}
                  placeholder={field.default != null ? String(field.default) : undefined}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-panel-raised)] px-2 py-1.5 font-mono text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              )}
              {fieldError && <span className="text-[var(--color-danger)]">{fieldError}</span>}
              {!fieldError && field.help && <span className="text-[var(--color-text-muted)]">{field.help}</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
