"use client";

import React from "react";
import { ExtractorTrace } from "@/lib/api/types";
import { Filter, Check, X } from "lucide-react";
import { EvidenceChunkCard } from "./evidence-chunk-card";
import { useTraceStore } from "@/lib/store/use-trace-store";
import { cn } from "@/lib/utils/cn";

interface ExtractorTraceSectionProps {
  trace: ExtractorTrace;
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-md border border-[var(--border-surface)] bg-[var(--bg-subtle)] px-2 py-1.5">
      <p className="text-[10px] text-[var(--text-muted)] leading-none">{label}</p>
      <p className="mt-1 text-[12px] font-medium text-ink tabular">
        {typeof value === "number" ? `${Math.round(value * 100)}%` : "—"}
      </p>
    </div>
  );
}

export function ExtractorTraceSection({ trace }: ExtractorTraceSectionProps) {
  const { hoveredCitationIds, showFilteredChunks, toggleFilteredChunks } = useTraceStore();

  const totalChunks = trace.subQueries.flatMap((sq) => sq.chunks);
  const keptCount = totalChunks.filter((c) => c.keptForReasoning).length;
  const filteredCount = totalChunks.length - keptCount;

  return (
    <section className="rounded-lg border border-[var(--border-surface)] bg-[var(--bg-surface)]">
      <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[var(--border-surface)]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--accent-secondary-text)]" />
          <div>
            <h4 className="text-[12px] font-semibold text-ink leading-none">Extractor</h4>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Retrieval and dual scoring</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {typeof trace.evaluationPassed === "boolean" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium",
                trace.evaluationPassed
                  ? "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)]"
                  : "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
              )}
            >
              {trace.evaluationPassed ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
              {trace.evaluationPassed ? "passed" : "failed"}
            </span>
          )}
          <span className="rounded border border-[var(--border-surface)] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)] tabular">
            {keptCount}/{totalChunks.length} kept
          </span>
        </div>
      </header>

      <div className="p-3 space-y-3">
        {(trace.hitRate != null || trace.mrr != null || trace.contextPrecision != null) && (
          <div>
            <div className="grid grid-cols-3 gap-1.5">
              <Metric label="Hit rate" value={trace.hitRate} />
              <Metric label="MRR" value={trace.mrr} />
              <Metric label="Ctx precision" value={trace.contextPrecision} />
            </div>
            <p className="mt-1.5 text-[10px] text-[var(--text-muted)] leading-snug">
              Computed from this run&apos;s own keep decisions, not hand-labelled relevance.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {trace.subQueries.map((sq, sqIdx) => {
            const visible = sq.chunks.filter((c) => c.keptForReasoning || showFilteredChunks);
            return (
              <div key={sqIdx} className="space-y-1.5">
                <p className="text-[11px] text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)]">Sub-query {sqIdx + 1}: </span>
                  {sq.query}
                </p>
                <div className="space-y-1.5">
                  {visible.map((chunk) => (
                    <EvidenceChunkCard
                      key={chunk.id}
                      chunk={chunk}
                      isHighlighted={hoveredCitationIds.includes(chunk.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filteredCount > 0 && (
          <button
            onClick={toggleFilteredChunks}
            className="w-full rounded-md border border-dashed border-[var(--border-surface)] py-1.5 text-[11px] text-[var(--text-muted)] hover:text-ink hover:border-[var(--border-strong)] transition-colors"
          >
            {showFilteredChunks ? "Hide" : "Show"} {filteredCount} filtered chunk{filteredCount === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </section>
  );
}
