"use client";

import React, { useState } from "react";
import { PlannerTrace } from "@/lib/api/types";
import { ConfidenceBadge } from "./confidence-badge";
import { AttentionHeatmap } from "./attention-heatmap";
import { useUIStore } from "@/lib/store/use-ui-store";
import { Compass, RefreshCw, ChevronDown, ChevronUp, Check, X, Minus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PlannerTraceSectionProps {
  trace: PlannerTrace;
}

const STATUS_ICON = {
  PASS: { Icon: Check, className: "text-[var(--status-success)]" },
  STABLE: { Icon: Check, className: "text-[var(--status-success)]" },
  FAIL: { Icon: X, className: "text-[var(--status-danger)]" },
  UNSTABLE: { Icon: X, className: "text-[var(--status-danger)]" },
  WARNING: { Icon: AlertTriangle, className: "text-[var(--status-warning)]" },
  SKIPPED: { Icon: Minus, className: "text-[var(--text-muted)]" },
} as const;

function CheckRow({ label, check }: { label: string; check?: { status: string; reason?: string } }) {
  const status = (check?.status || "SKIPPED") as keyof typeof STATUS_ICON;
  const { Icon, className } = STATUS_ICON[status] ?? STATUS_ICON.SKIPPED;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", className)} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-medium text-ink">{label}</span>
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            {status === "SKIPPED" ? "not run" : status.toLowerCase()}
          </span>
        </div>
        {check?.reason && (
          <p className="text-[11px] text-[var(--text-muted)] leading-snug mt-0.5">{check.reason}</p>
        )}
      </div>
    </div>
  );
}

export function PlannerTraceSection({ trace }: PlannerTraceSectionProps) {
  // Honour the saved "expand attention matrix" preference as the initial state.
  const showHeatmapsByDefault = useUIStore((s) => s.showHeatmapsByDefault);
  const [showHeatmap, setShowHeatmap] = useState(showHeatmapsByDefault);

  return (
    <section className="rounded-lg border border-[var(--border-surface)] bg-[var(--bg-surface)]">
      <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[var(--border-surface)]">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[var(--accent-text)]" />
          <div>
            <h4 className="text-[12px] font-semibold text-ink leading-none">Planner</h4>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Decomposition and verification</p>
          </div>
        </div>
        <ConfidenceBadge confidence={trace.confidence} />
      </header>

      <div className="p-3 space-y-3">
        {trace.retried && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2.5 py-2">
            <RefreshCw className="w-3.5 h-3.5 mt-0.5 text-[var(--status-warning)] shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-[var(--status-warning)]">Retried after a failed check</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                {trace.retryReason || "Regenerated with corrective feedback."}
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
            Steps
          </p>
          <ol className="space-y-1.5">
            {trace.steps.map((step, idx) => (
              <li key={step.id} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded bg-[var(--bg-subtle)] text-[10px] font-medium text-[var(--text-secondary)] shrink-0 tabular">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] text-[var(--text-secondary)] leading-snug">{step.text}</p>
                  {step.dependsOn && step.dependsOn.length > 0 && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      depends on step {step.dependsOn.join(", ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {trace.verificationChecks && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)] mb-1">
              Verification checks
            </p>
            <div className="divide-y divide-[var(--border-surface)]">
              <CheckRow label="Entity coverage" check={trace.verificationChecks.entityCoverage} />
              <CheckRow label="Requirement coverage" check={trace.verificationChecks.requirementCoverage} />
              <CheckRow label="Self-consistency" check={trace.verificationChecks.selfConsistency} />
              <CheckRow label="Attention grounding" check={trace.verificationChecks.attentionXai} />
            </div>
          </div>
        )}

        {trace.keywords.length > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Reference entities
            </p>
            <div className="flex flex-wrap gap-1">
              {trace.keywords.map((kw, i) => (
                <span
                  key={`${kw}-${i}`}
                  className="rounded border border-[var(--border-surface)] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-1">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className="flex w-full items-center justify-between text-[11px] text-[var(--text-secondary)] hover:text-ink"
          >
            <span>Attention saliency</span>
            {showHeatmap ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showHeatmap && (
            <div className="mt-2">
              <AttentionHeatmap matrix={trace.attentionMatrix} rowLabels={trace.rowLabels} colLabels={trace.colLabels} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
