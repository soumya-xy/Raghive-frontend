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
    info.level === "HIGH" ? ShieldCheck : info.level === "MEDIUM" ? AlertTriangle : ShieldAlert;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        info.badgeClass,
        className
      )}
      title="Fraction of independent planner verification checks that passed"
    >
      <Icon className="w-3 h-3" />
      <span className="tabular">{Math.round(confidence * 100)}%</span>
      <span className="opacity-70">{info.label}</span>
    </div>
  );
}
