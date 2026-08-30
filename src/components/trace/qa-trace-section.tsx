"use client";

import React from "react";
import { QATrace } from "@/lib/api/types";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { CitationHeatmap } from "./citation-heatmap";
import { cn } from "@/lib/utils/cn";

interface QATraceSectionProps {
  trace: QATrace;
}

export function QATraceSection({ trace }: QATraceSectionProps) {
  const faithfulnessPercent = Math.round(trace.faithfulnessScore * 100);

  return (
    <div className="space-y-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-ink">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm">3. QA / Reasoning Agent</h4>
            <p className="text-[11px] text-muted font-mono">
              Synthesis & Faithfulness Grounding
            </p>
          </div>
        </div>

        <span
          className={cn(
            "text-xs font-mono font-bold px-2.5 py-1 rounded-full border shadow-xs flex items-center space-x-1",
            faithfulnessPercent >= 85
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : faithfulnessPercent >= 70
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
          )}
        >
          <Sparkles className="w-3 h-3 mr-1" />
          <span>{faithfulnessPercent}% Grounded</span>
        </span>
      </div>

      {/* Low Grounding Warning Banner */}
      {trace.belowGroundingThreshold && (
        <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold font-mono uppercase tracking-wider text-[10px]">
              Low Grounding Caution:
            </span>
            <p className="mt-0.5 text-[11px]">
              Faithfulness fell below strict grounding threshold (70%). Portions of this answer may rely on parametric memory rather than verified document evidence.
            </p>
          </div>
        </div>
      )}

      {/* Faithfulness Radial Gauge */}
      <div className="p-3 rounded-xl border border-surface bg-surface flex items-center justify-between">
        <div>
          <span className="text-xs font-mono text-muted uppercase tracking-wider">
            Faithfulness Grounding Index
          </span>
          <p className="text-xs text-ink mt-0.5">
            Ratio of synthesized tokens backed by verified vector evidence.
          </p>
        </div>

        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="22"
              className="stroke-surface"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="28"
              cy="28"
              r="22"
              className={cn(
                "transition-all duration-1000 ease-out",
                faithfulnessPercent >= 85
                  ? "stroke-emerald-500"
                  : faithfulnessPercent >= 70
                  ? "stroke-amber-500"
                  : "stroke-rose-500"
              )}
              strokeWidth="4"
              strokeDasharray={138}
              strokeDashoffset={138 - (138 * faithfulnessPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <span className="absolute font-mono text-xs font-bold text-ink">
            {faithfulnessPercent}%
          </span>
        </div>
      </div>

      {/* Citation Heatmap */}
      <CitationHeatmap qa={trace} />

      {/* Erasure Test Signal */}
      <div className="p-3 rounded-xl border border-surface bg-surface flex items-center justify-between text-xs">
        <div className="space-y-0.5">
          <span className="font-mono text-[11px] font-semibold text-ink">
            Counterfactual Term Erasure Test
          </span>
          <p className="text-[11px] text-muted">
            Masked core query entities and tested if generated answer changed.
          </p>
        </div>

        {trace.erasureTestChanged ? (
          <span className="inline-flex items-center text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            PASSED (Answer Changed)
          </span>
        ) : (
          <span className="inline-flex items-center text-[10px] font-mono font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            FAILED (Hallucination Signal)
          </span>
        )}
      </div>
    </div>
  );
}
