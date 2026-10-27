import React from "react";
import { cn } from "@/lib/utils/cn";

interface HexMarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
}

export function HexMark({ className, size = "md", glow = false }: HexMarkProps) {
  const dimensions = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-10 h-10",
    xl: "w-14 h-14",
  }[size];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center text-amber-500 transition-all duration-300",
        dimensions,
        glow && "drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]",
        className
      )}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Outer Hexagon */}
        <polygon
          points="50 3, 93 25, 93 75, 50 97, 7 75, 7 25"
          className="stroke-amber-500 dark:stroke-amber-400"
          strokeWidth="6"
          strokeLinejoin="round"
          fill="rgba(217, 119, 6, 0.08)"
        />
        {/* Inner Glass-Box Reticle */}
        <polygon
          points="50 20, 78 35, 78 65, 50 80, 22 65, 22 35"
          className="stroke-teal-600 dark:stroke-teal-400"
          strokeWidth="4"
          strokeDasharray="6 4"
          fill="none"
        />
        {/* Center Glass-Box Core */}
        <circle cx="50" cy="50" r="10" className="fill-amber-500 dark:fill-amber-400" />
      </svg>
    </div>
  );
}
