"use client";

import React from "react";
import { QATrace } from "@/lib/api/types";
import { useTraceStore } from "@/lib/store/use-trace-store";
import { Link2 } from "lucide-react";

interface CitationHeatmapProps {
  qa: QATrace;
}

/** Sentence to evidence links. Hovering a sentence highlights its chunks. */
export function CitationHeatmap({ qa }: CitationHeatmapProps) {
  const { setHoveredCitationIds, setHoveredSentenceSpan } = useTraceStore();

  if (!qa.citations?.length) return null;

  return (
    <div className="rounded-md border border-[var(--border-surface)]">
      <div className="flex items-center gap-1.5 border-b border-[var(--border-surface)] px-2.5 py-1.5">
        <Link2 className="w-3 h-3 text-[var(--text-muted)]" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Sentence citations
        </span>
        <span className="ml-auto text-[10px] text-[var(--text-muted)]">
          {qa.citations.length} sentence{qa.citations.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="px-2.5 py-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
        {qa.citations.map((cite, idx) => {
          const text = qa.answer.slice(cite.sentenceSpan[0], cite.sentenceSpan[1]);
          const ids = cite.evidenceChunkIds;
          const hasEvidence = ids.length > 0;
          return (
            <span
              key={idx}
              onMouseEnter={() => {
                setHoveredCitationIds(ids);
                setHoveredSentenceSpan(cite.sentenceSpan);
              }}
              onMouseLeave={() => {
                setHoveredCitationIds([]);
                setHoveredSentenceSpan(null);
              }}
              className={
                hasEvidence
                  ? "cursor-pointer rounded-sm border-b border-[var(--accent-primary-border)] hover:bg-[var(--accent-primary-light)]"
                  : "rounded-sm border-b border-dashed border-[var(--border-strong)]"
              }
              title={
                hasEvidence
                  ? `Supported by ${ids.length} chunk${ids.length === 1 ? "" : "s"}`
                  : "No evidence chunk cleared the citation threshold"
              }
            >
              {text}
              {hasEvidence && (
                <sup className="ml-0.5 text-[9px] font-medium text-[var(--accent-text)]">[{ids.length}]</sup>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
