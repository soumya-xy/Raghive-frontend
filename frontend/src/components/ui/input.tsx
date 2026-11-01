import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-[var(--border-surface)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] text-ink placeholder:text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] focus:outline-none focus:border-[var(--accent-ring)] focus:ring-1 focus:ring-[var(--accent-ring)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
