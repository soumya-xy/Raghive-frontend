import { ConfidenceLevel } from "../api/types";

export function getConfidenceBadge(confidence: number): {
  level: ConfidenceLevel;
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  if (confidence >= 0.85) {
    return {
      level: "HIGH",
      label: "HIGH CONFIDENCE",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      dotClass: "bg-emerald-500",
    };
  } else if (confidence >= 0.65) {
    return {
      level: "MEDIUM",
      label: "MEDIUM CONFIDENCE",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      dotClass: "bg-amber-500",
    };
  } else {
    return {
      level: "LOW",
      label: "LOW CONFIDENCE",
      badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      dotClass: "bg-rose-500",
    };
  }
}

export function formatScorePercentage(score: number): string {
  return `${Math.round(score * 100)}%`;
}
