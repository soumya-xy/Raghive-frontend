import React from "react";
import { cn } from "@/lib/utils/cn";

interface HexMarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
}

/**
 * RAGHive mark: a filled lavender hexagon with an inner reticle in deep indigo.
 */
export function HexMark({ className, size = "md", glow = false }: HexMarkProps) {
  const dimensions = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  }[size];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        glow && "drop-shadow-[0_6px_14px_rgba(159,160,255,0.55)]",
        dimensions,
        className
      )}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-hidden="true"
      >
        <polygon
          points="50 4, 92 26, 92 74, 50 96, 8 74, 8 26"
          fill="var(--accent-primary)"
          stroke="var(--accent-primary)"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <polygon
          points="50 26, 72 38, 72 62, 50 74, 28 62, 28 38"
          stroke="var(--accent-contrast)"
          strokeOpacity="0.45"
          strokeWidth="4"
          strokeDasharray="5 5"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="50" cy="50" r="8" fill="var(--accent-contrast)" />
      </svg>
    </div>
  );
}
