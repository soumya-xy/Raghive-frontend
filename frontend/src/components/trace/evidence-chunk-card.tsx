"use client";

import React, { useState } from "react";
import { EvidenceChunk } from "@/lib/api/types";
import { FileText, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface EvidenceChunkCardProps {
  chunk: EvidenceChunk;
  isHighlighted?: boolean;
}

function Meter({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
        <span className="text-[10px] font-medium text-ink tabular">{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function EvidenceChunkCard({ chunk, isHighlighted = false }: EvidenceChunkCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg border p-2.5 space-y-2 transition-colors",
        chunk.keptForReasoning
          ? "border-[var(--border-surface)] bg-[var(--bg-surface)]"
          : "border-dashed border-[var(--border-surface)] bg-transparent opacity-70",
        isHighlighted && "border-[var(--accent-ring)] bg-[var(--accent-primary-light)]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          <span className="text-[11px] font-medium text-ink truncate">
            {chunk.sourceDocument}
            {chunk.pageNumber ? <span className="text-[var(--text-muted)]"> · p.{chunk.pageNumber}</span> : null}
          </span>
        </div>

        {chunk.keptForReasoning ? (
          <span className="inline-flex items-center gap-1 shrink-0 rounded border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--status-success)]">
            <Check className="w-2.5 h-2.5" />
            Kept
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 shrink-0 rounded border border-[var(--border-surface)] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
            <X className="w-2.5 h-2.5" />
            Filtered
          </span>
        )}
      </div>

      <div>
        <p className={cn("text-[12px] leading-relaxed text-[var(--text-secondary)]", !expanded && "line-clamp-3")}>
          {chunk.text}
        </p>
        {chunk.text.length > 140 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-[var(--accent-text)] hover:text-[var(--accent-text-strong)]"
          >
            {expanded ? "Show less" : "Show more"}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
        <Meter label="Similarity" value={chunk.similarityScore} color="var(--accent-secondary)" />
        <Meter label="Attribution" value={chunk.attributionScore} color="var(--accent-primary)" />
      </div>

      {chunk.filterReason && !chunk.keptForReasoning && (
        <p className="text-[10px] text-[var(--text-muted)]">{chunk.filterReason}</p>
      )}
    </div>
  );
}
