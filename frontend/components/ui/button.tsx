import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90",
        outline:
          "border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:border-[var(--color-text-muted)]",
        ghost: "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
        destructive: "bg-[var(--color-danger)] text-white hover:opacity-90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
