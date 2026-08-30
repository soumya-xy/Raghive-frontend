"use client";

import React from "react";
import { ExtractorTrace } from "@/lib/api/types";
import { Filter, Eye, EyeOff, Search } from "lucide-react";
import { EvidenceChunkCard } from "./evidence-chunk-card";
import { useTraceStore } from "@/lib/store/use-trace-store";

interface ExtractorTraceSectionProps {
  trace: ExtractorTrace;
}

export function ExtractorTraceSection({ trace }: ExtractorTraceSectionProps) {
  const { hoveredCitationIds, showFilteredChunks, toggleFilteredChunks } = useTraceStore();

  const totalChunks = trace.subQueries.flatMap((sq) => sq.chunks);
  const keptChunksCount = totalChunks.filter((c) => c.keptForReasoning).length;
  const filteredChunksCount = totalChunks.filter((c) => !c.keptForReasoning).length;

  return (
    <div className="space-y-4 p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 text-ink">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-600 dark:text-teal-400">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm">2. Extractor Agent</h4>
            <p className="text-[11px] text-muted font-mono">
              ChromaDB Vector Retrieval & NormEnsembleXAI Scoring
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30">
          {keptChunksCount} / {totalChunks.length} Chunks Kept
        </span>
      </div>

      {/* Sub-Queries & Evidence Chunks */}
      <div className="space-y-4">
        {trace.subQueries.map((sq, sqIdx) => {
          const visibleChunks = sq.chunks.filter(
            (c) => c.keptForReasoning || showFilteredChunks
          );

          return (
            <div key={sqIdx} className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-teal-700 dark:text-teal-300">
                <Search className="w-3.5 h-3.5" />
                <span>Sub-Query: "{sq.query}"</span>
              </div>

              <div className="space-y-2 pl-2">
                {visibleChunks.map((chunk) => (
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

      {/* Filtered Chunks Toggle */}
      {filteredChunksCount > 0 && (
        <button
          onClick={toggleFilteredChunks}
          className="w-full p-2 rounded-lg border border-surface bg-surface text-xs font-mono text-muted hover:text-ink hover:border-teal-500/40 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
        >
          {showFilteredChunks ? <EyeOff className="w-3.5 h-3.5 text-teal-500" /> : <Eye className="w-3.5 h-3.5 text-teal-500" />}
          <span>
            {showFilteredChunks ? "Hide" : "Show"} {filteredChunksCount} Filtered Low-Attribution Chunks
          </span>
        </button>
      )}
    </div>
  );
}
