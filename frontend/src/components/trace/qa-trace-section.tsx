"use client";

import React from "react";
import { QATrace } from "@/lib/api/types";
import { ShieldCheck, ShieldAlert, Check, X } from "lucide-react";
import { CitationHeatmap } from "./citation-heatmap";
import { cn } from "@/lib/utils/cn";

interface QATraceSectionProps {
  trace: QATrace;
}

export function QATraceSection({ trace }: QATraceSectionProps) {
  const pct = Math.round(trace.faithfulnessScore * 100);
  const tone =
    pct >= 85 ? "success" : pct >= 70 ? "warning" : "danger";

  return (
    <section className="rounded-lg border border-[var(--border-surface)] bg-[var(--bg-surface)]">
      <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[var(--border-surface)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--status-success)]" />
          <div>
            <h4 className="text-[12px] font-semibold text-ink leading-none">QA / Reasoning</h4>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Grounded synthesis</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium tabular",
            tone === "success" && "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)]",
            tone === "warning" && "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
            tone === "danger" && "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
          )}
        >
          {pct}% grounded
        </span>
      </header>

      <div className="p-3 space-y-3">
        {trace.belowGroundingThreshold && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-2.5 py-2">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 text-[var(--status-danger)] shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-[var(--status-danger)]">Below grounding threshold</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                Part of this answer may not be supported by the retrieved evidence.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-md border border-[var(--border-surface)] px-2.5 py-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-[var(--text-secondary)]">Faithfulness</span>
            <span className="text-[12px] font-medium text-ink tabular">{pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                tone === "success" && "bg-[var(--status-success)]",
                tone === "warning" && "bg-[var(--status-warning)]",
                tone === "danger" && "bg-[var(--status-danger-fill)]"
              )}
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-[var(--text-muted)] leading-snug">
            Attention-based estimate from the evidence-attention pass, not a per-claim check.
          </p>
        </div>

        <CitationHeatmap qa={trace} />

        <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--border-surface)] px-2.5 py-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-ink">Erasure test</p>
            <p className="text-[10px] text-[var(--text-muted)] leading-snug">
              Query entities masked; answer similarity compared.
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium",
              trace.erasureTestChanged
                ? "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)]"
                : "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
            )}
          >
            {trace.erasureTestChanged ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
            {trace.erasureTestChanged ? "changed" : "unchanged"}
          </span>
        </div>
      </div>
    </section>
  );
}
