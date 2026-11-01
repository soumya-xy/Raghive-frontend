import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150 cursor-pointer select-none disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]";

    const variantStyles = {
      primary:
        "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-xs hover:bg-[var(--accent-primary-hover)] active:bg-[var(--accent-primary-hover)]",
      secondary:
        "bg-[var(--bg-subtle)] text-ink border border-[var(--border-surface)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-strong)]",
      outline:
        "bg-[var(--bg-surface)] text-ink border border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]",
      ghost: "text-[var(--text-secondary)] hover:text-ink hover:bg-[var(--bg-subtle)]",
      danger:
        "bg-[var(--status-danger-fill)] text-[var(--status-danger-contrast)] shadow-xs hover:brightness-95 active:brightness-90",
    }[variant];

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-3.5 text-sm gap-2",
      lg: "h-11 px-5 text-sm gap-2",
      icon: "h-8 w-8 p-0",
    }[size];

    return (
      <Comp
        className={cn(baseStyles, variantStyles, sizeStyles, className)}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
