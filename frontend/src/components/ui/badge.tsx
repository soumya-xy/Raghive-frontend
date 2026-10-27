import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "amber" | "teal" | "success" | "warning" | "danger" | "outline";
}

function Badge({ className, variant = "amber", ...props }: BadgeProps) {
  const variants = {
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    teal: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    danger: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    outline: "border-surface text-muted bg-transparent",
  }[variant];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors font-mono tracking-tight",
        variants,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
