"use client";

import React from "react";
import { QATrace } from "@/lib/api/types";
import { useTraceStore } from "@/lib/store/use-trace-store";
import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CitationHeatmapProps {
  qa: QATrace;
}

export function CitationHeatmap({ qa }: CitationHeatmapProps) {
  const { setHoveredCitationIds, setHoveredSentenceSpan } = useTraceStore();

  const handleMouseEnter = (chunkIds: string[], span: [number, number]) => {
    setHoveredCitationIds(chunkIds);
    setHoveredSentenceSpan(span);
  };

  const handleMouseLeave = () => {
    setHoveredCitationIds([]);
    setHoveredSentenceSpan(null);
  };

  return (
    <div className="space-y-2 p-3 rounded-xl border border-surface bg-surface text-xs">
      <div className="flex items-center space-x-1.5 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
        <Link2 className="w-3.5 h-3.5" />
        <span>Sentence-Level Evidence Citation Map</span>
      </div>

      <p className="text-[11px] text-muted font-mono">
        Hover over sentences to highlight their supporting document evidence chunk(s).
      </p>

      <div className="p-3 rounded-lg border border-surface bg-app leading-relaxed text-sm font-sans space-y-1">
        {qa.citations.map((cite, idx) => {
          const sentenceText = qa.answer.slice(cite.sentenceSpan[0], cite.sentenceSpan[1]);
          return (
            <span
              key={idx}
              onMouseEnter={() => handleMouseEnter(cite.evidenceChunkIds, cite.sentenceSpan)}
              onMouseLeave={handleMouseLeave}
              className={cn(
                "inline rounded px-1 py-0.5 transition-all cursor-pointer border-b-2 border-emerald-500/40 hover:bg-emerald-500/20 hover:border-emerald-500",
                "mr-1"
              )}
              title={`Supported by Chunk(s): ${cite.evidenceChunkIds.join(", ")}`}
            >
              {sentenceText}
              <sup className="ml-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                [{cite.evidenceChunkIds.map((id) => id.replace("chunk_", "#")).join(",")}]
              </sup>
            </span>
          );
        })}
      </div>
    </div>
  );
}
