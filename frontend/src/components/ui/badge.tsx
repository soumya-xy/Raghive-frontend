import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "neutral" | "accent" | "teal" | "success" | "warning" | "danger" | "outline";
}

function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  const variants = {
    neutral:
      "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-surface)]",
    accent:
      "bg-[var(--accent-primary-light)] text-[var(--accent-text)] border-[var(--accent-primary-border)]",
    teal: "bg-[var(--accent-secondary-light)] text-[var(--accent-secondary-text)] border-[var(--accent-secondary-border)]",
    success:
      "bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]",
    warning:
      "bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]",
    danger:
      "bg-[var(--status-danger-bg)] text-[var(--status-danger)] border-[var(--status-danger-border)]",
    outline: "border-[var(--border-strong)] text-[var(--text-secondary)] bg-transparent",
  }[variant];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 tracking-tight",
        variants,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
