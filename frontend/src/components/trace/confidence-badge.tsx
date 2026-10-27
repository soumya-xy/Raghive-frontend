import React from "react";
import { getConfidenceBadge } from "@/lib/utils/confidence";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const info = getConfidenceBadge(confidence);

  const Icon =
    info.level === "HIGH"
      ? ShieldCheck
      : info.level === "MEDIUM"
      ? AlertTriangle
      : ShieldAlert;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border shadow-sm",
        info.badgeClass,
        className
      )}
    >
      <span className={cn("w-2 h-2 rounded-full animate-pulse", info.dotClass)} />
      <Icon className="w-3.5 h-3.5" />
      <span>
        {info.label} ({Math.round(confidence * 100)}%)
      </span>
    </div>
  );
}
