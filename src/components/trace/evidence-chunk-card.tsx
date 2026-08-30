"use client";

import React, { useState } from "react";
import { EvidenceChunk } from "@/lib/api/types";
import { FileText, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface EvidenceChunkCardProps {
  chunk: EvidenceChunk;
  isHighlighted?: boolean;
}

export function EvidenceChunkCard({ chunk, isHighlighted = false }: EvidenceChunkCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "p-3 rounded-xl border transition-all text-xs space-y-2",
        chunk.keptForReasoning
          ? "border-teal-500/30 bg-teal-500/5 text-ink"
          : "border-surface bg-surface/40 opacity-60 line-through text-muted",
        isHighlighted && "ring-2 ring-amber-500 bg-amber-500/10 shadow-md scale-[1.01]"
      )}
    >
      {/* File Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 truncate">
          <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="font-mono text-[11px] font-semibold truncate text-ink">
            {chunk.sourceDocument}
          </span>
        </div>
        {chunk.keptForReasoning ? (
          <span className="inline-flex items-center text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            KEPT
          </span>
        ) : (
          <span className="inline-flex items-center text-[10px] font-mono font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            FILTERED OUT
          </span>
        )}
      </div>

      {/* Chunk text content */}
      <div className="relative">
        <p
          className={cn(
            "text-xs leading-relaxed text-ink/90 font-serif italic",
            !expanded && "line-clamp-2"
          )}
        >
          "{chunk.text}"
        </p>
        {chunk.text.length > 90 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] font-mono text-teal-600 dark:text-teal-400 hover:underline mt-1 flex items-center cursor-pointer"
          >
            {expanded ? (
              <>
                <span>Collapse text</span>
                <ChevronUp className="w-3 h-3 ml-0.5" />
              </>
            ) : (
              <>
                <span>Expand full chunk</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Dual Scores Comparison Meter Bars */}
      <div className="pt-2 border-t border-surface grid grid-cols-2 gap-3">
        {/* Vector Similarity Score (Teal) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-muted">Similarity</span>
            <span className="font-semibold text-teal-600 dark:text-teal-400">
              {Math.round(chunk.similarityScore * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-teal-500/20 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full"
              style={{ width: `${chunk.similarityScore * 100}%` }}
            />
          </div>
        </div>

        {/* NormEnsembleXAI Attribution Score (Amber) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-muted">Attribution (XAI)</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {Math.round(chunk.attributionScore * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-amber-500/20 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${chunk.attributionScore * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
