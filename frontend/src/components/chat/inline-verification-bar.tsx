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

const chip = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium";

/** Compact, factual summary chips. They report values; they do not assert success. */
export function InlineVerificationBar({ messageId, trace }: InlineVerificationBarProps) {
  const { setTracePanelOpen } = useUIStore();
  const { setActiveTrace, setActiveMessageId } = useChatStore();

  if (!trace || (!trace.planner && !trace.extractor && !trace.qa)) return null;

  const handleOpenTrace = () => {
    setActiveTrace(trace);
    setActiveMessageId(messageId);
    setTracePanelOpen(true);
  };

  const keptChunkIds = new Set(
    trace.extractor?.subQueries?.flatMap((sq) => sq?.chunks || []).filter((c) => c?.keptForReasoning).map((c) => c?.id) || []
  );

  const faithfulnessPct =
    trace.qa?.faithfulnessScore != null ? Math.round(trace.qa.faithfulnessScore * 100) : null;
  const planStatus = trace.planner?.verificationChecks
    ? Object.values(trace.planner.verificationChecks).filter((c) => c?.status === "FAIL").length > 0
      ? "failed"
      : "passed"
    : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      {trace.planner && (
        <span className={cn(chip, "bg-[var(--accent-primary-light)] text-[var(--accent-text)]")}>
          <Compass className="h-3 w-3" />
          Plan{planStatus ? ` ${planStatus}` : ""}
        </span>
      )}

      {trace.extractor && (
        <span className={cn(chip, "bg-[var(--mint)] text-[var(--accent-secondary-text)]")}>
          <Filter className="h-3 w-3" />
          <span className="tabular">{keptChunkIds.size}</span> chunks kept
        </span>
      )}

      {trace.qa && faithfulnessPct !== null && (
        <span
          className={cn(
            chip,
            faithfulnessPct >= 85
              ? "bg-[var(--status-success-bg)] text-[var(--status-success)]"
              : faithfulnessPct >= 70
              ? "bg-[var(--cream)] text-[var(--cream-text)]"
              : "bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
          )}
          title="Attention-based grounding estimate (see trace for details)"
        >
          <ShieldCheck className="h-3 w-3" />
          <span className="tabular">{faithfulnessPct}%</span> grounding
        </span>
      )}

      <button
        onClick={handleOpenTrace}
        className={cn(
          chip,
          "border border-[var(--border-surface)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary-border)] hover:text-[var(--accent-text)]"
        )}
      >
        View trace
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
