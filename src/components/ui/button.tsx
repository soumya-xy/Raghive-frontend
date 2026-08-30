import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "amber" | "teal" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "amber",
      size = "md",
      asChild = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app";

    const variantStyles = {
      amber:
        "bg-amber-600 dark:bg-amber-500 text-white dark:text-zinc-950 hover:bg-amber-700 dark:hover:bg-amber-400 active:scale-[0.98]",
      teal: "bg-teal-700 dark:bg-teal-500 text-white dark:text-zinc-950 hover:bg-teal-800 dark:hover:bg-teal-400 active:scale-[0.98]",
      outline:
        "border border-surface bg-surface text-ink hover:bg-amber-500/10 hover:border-amber-500/30",
      ghost: "text-muted hover:text-ink hover:bg-amber-500/10",
      danger:
        "bg-rose-700 dark:bg-rose-600 text-white hover:bg-rose-800 dark:hover:bg-rose-500",
    }[variant];

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
      icon: "h-9 w-9 p-0 text-sm",
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
