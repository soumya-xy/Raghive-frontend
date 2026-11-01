import { ConfidenceLevel } from "../api/types";

/**
 * Confidence here is the fraction of independent verification checks that passed.
 * The labels say so; they are not a calibrated probability.
 */
export function getConfidenceBadge(confidence: number): {
  level: ConfidenceLevel;
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  if (confidence >= 0.85) {
    return {
      level: "HIGH",
      label: "Checks passed",
      badgeClass:
        "bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]",
      dotClass: "bg-[var(--status-success)]",
    };
  } else if (confidence >= 0.65) {
    return {
      level: "MEDIUM",
      label: "Partly passed",
      badgeClass:
        "bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]",
      dotClass: "bg-[var(--status-warning)]",
    };
  } else {
    return {
      level: "LOW",
      label: "Checks failed",
      badgeClass:
        "bg-[var(--status-danger-bg)] text-[var(--status-danger)] border-[var(--status-danger-border)]",
      dotClass: "bg-[var(--status-danger-fill)]",
    };
  }
}

export function formatScorePercentage(score: number): string {
  return `${Math.round(score * 100)}%`;
}
