"use client";

import React, { useState } from "react";
import { PlannerTrace } from "@/lib/api/types";
import { ConfidenceBadge } from "./confidence-badge";
import { AttentionHeatmap } from "./attention-heatmap";
import { Compass, RefreshCw, Tag, ChevronDown, ChevronUp, Layers, CheckCircle2, XCircle, MinusCircle, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";

interface PlannerTraceSectionProps {
  trace: PlannerTrace;
}

export function PlannerTraceSection({ trace }: PlannerTraceSectionProps) {
  const [showHeatmap, setShowHeatmap] = useState(true);

  return (
    <div className="space-y-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-ink">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm">1. Planner Agent</h4>
            <p className="text-[11px] text-muted font-mono">Query Decomposition & Keyword Focus</p>
          </div>
        </div>
        <ConfidenceBadge confidence={trace.confidence} />
      </div>

      {/* Self-Correction Loop Banner */}
      {trace.retried && (
        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300 flex items-start space-x-2">
          <RefreshCw className="w-4 h-4 mt-0.5 text-amber-500 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
          <div>
            <span className="font-semibold font-mono uppercase tracking-wider text-[10px]">
              Self-Correction Triggered:
            </span>
            <p className="mt-0.5 text-[11px]">{trace.retryReason || "Attention focus check failed initial pass. Retried with corrective feedback."}</p>
          </div>
        </div>
      )}

      {/* Decomposed Steps connected list */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono text-muted uppercase tracking-wider">
          Decomposed Execution Steps
        </span>
        <div className="relative pl-3 space-y-3">
          {/* Connector Line */}
          <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-amber-500/30" />

          {trace.steps.map((step, idx) => (
            <div key={step.id} className="relative flex items-start space-x-3 group">
              <div className="relative z-10 w-6 h-6 rounded-full bg-amber-500 text-zinc-950 font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {idx + 1}
              </div>
              <div className="flex-1 p-2.5 rounded-lg border border-surface bg-surface text-xs text-ink font-medium shadow-xs">
                {step.text}
                {step.dependsOn && step.dependsOn.length > 0 && (
                  <span className="ml-2 inline-flex items-center text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    <Layers className="w-3 h-3 mr-1" />
                    Depends on Step {step.dependsOn.join(", ")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {trace.verificationChecks && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono text-muted uppercase tracking-wider">
            Independent verification checks
          </span>
          {(
            [
              ["Entity coverage", trace.verificationChecks.entityCoverage],
              ["Requirement coverage", trace.verificationChecks.requirementCoverage],
              ["Self-consistency", trace.verificationChecks.selfConsistency],
              ["Attention grounding", trace.verificationChecks.attentionXai],
            ] as const
          ).map(([label, check]) => {
            const status = check?.status || "SKIPPED";
            const Icon =
              status === "PASS" || status === "STABLE"
                ? CheckCircle2
                : status === "FAIL" || status === "UNSTABLE"
                ? XCircle
                : status === "WARNING"
                ? AlertTriangle
                : MinusCircle;
            return (
              <div
                key={label}
                className="flex items-start space-x-2 p-2 rounded-lg border border-surface bg-surface text-xs"
              >
                <Icon className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
                <div>
                  <div className="font-mono font-semibold">
                    {label} · {status}
                  </div>
                  {check?.reason && <p className="text-[11px] text-muted mt-0.5">{check.reason}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Keyword Chips */}
      <div className="space-y-1.5">
        <div className="flex items-center text-[11px] font-mono text-muted uppercase tracking-wider">
          <Tag className="w-3 h-3 mr-1 text-amber-500" />
          <span>Reference entities</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {trace.keywords.map((kw, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-600 dark:text-amber-400"
            >
              #{kw}
            </span>
          ))}
        </div>
      </div>

      {/* Attention Heatmap Toggle & Container */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHeatmap(!showHeatmap)}
          className="w-full justify-between text-xs"
        >
          <span>Attention Saliency Matrix</span>
          {showHeatmap ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>

        {showHeatmap && (
          <div className="mt-3">
            <AttentionHeatmap
              matrix={trace.attentionMatrix}
              rowLabels={trace.rowLabels}
              colLabels={trace.colLabels}
            />
          </div>
        )}
      </div>
    </div>
  );
}
