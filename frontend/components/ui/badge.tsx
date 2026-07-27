import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", {
  variants: {
    variant: {
      default: "border-[var(--color-border)] bg-[var(--color-panel-raised)] text-[var(--color-text-muted)]",
      accent: "border-transparent bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
      warn: "border-transparent bg-[color-mix(in_srgb,var(--color-warn)_15%,transparent)] text-[var(--color-warn)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
