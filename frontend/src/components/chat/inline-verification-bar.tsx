"use client";

import React from "react";
import { ReasoningTrace } from "@/lib/api/types";
import { Compass, Filter, ShieldCheck, ArrowRight } from "lucide-react";
import { useUIStore } from "@/lib/store/use-ui-store";
import { useChatStore } from "@/lib/store/use-chat-store";
import { cn } from "@/lib/utils/cn";

interface InlineVerificationBarProps {
  messageId: string;
  trace?: ReasoningTrace | null;
}

export function InlineVerificationBar({ messageId, trace }: InlineVerificationBarProps) {
  const { setTracePanelOpen } = useUIStore();
  const { setActiveTrace, setActiveMessageId } = useChatStore();

  if (!trace || (!trace.planner && !trace.extractor && !trace.qa)) return null;

  const handleOpenTrace = () => {
    setActiveTrace(trace);
    setActiveMessageId(messageId);
    setTracePanelOpen(true);
  };

  const keptChunksCount =
    trace.extractor?.subQueries
      ?.flatMap((sq) => sq?.chunks || [])
      ?.filter((c) => c?.keptForReasoning)?.length ?? 0;

  const faithfulnessPct =
    trace.qa?.faithfulnessScore != null
      ? Math.round(trace.qa.faithfulnessScore * 100)
      : null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-surface bg-surface/60 text-xs font-mono">
      <div className="flex flex-wrap items-center gap-3">
        {/* Planner chip */}
        {trace.planner && (
          <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400">
            <Compass className="w-3.5 h-3.5" />
            <span className="font-semibold">Plan ✅</span>
          </div>
        )}

        {trace.planner && trace.extractor && <span className="text-muted">•</span>}

        {/* Extractor chip */}
        {trace.extractor && (
          <div className="flex items-center space-x-1.5 text-teal-600 dark:text-teal-400">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">{keptChunksCount} Evidence Chunks ✅</span>
          </div>
        )}

        {(trace.planner || trace.extractor) && trace.qa && faithfulnessPct !== null && (
          <span className="text-muted">•</span>
        )}

        {/* QA Faithfulness chip */}
        {trace.qa && faithfulnessPct !== null && (
          <div
            className={cn(
              "flex items-center space-x-1.5 font-bold",
              faithfulnessPct >= 85
                ? "text-emerald-600 dark:text-emerald-400"
                : faithfulnessPct >= 70
                ? "text-amber-600 dark:text-amber-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{faithfulnessPct}% Grounded</span>
          </div>
        )}
      </div>

      {/* Expand Full Trace CTA */}
      <button
        onClick={handleOpenTrace}
        className="inline-flex items-center space-x-1 font-sans text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline cursor-pointer group transition-all"
      >
        <span>View full reasoning trace</span>
        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
