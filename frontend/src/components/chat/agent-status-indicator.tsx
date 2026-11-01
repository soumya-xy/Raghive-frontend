"use client";

import React from "react";
import { Check } from "lucide-react";
import { useChatStore } from "@/lib/store/use-chat-store";
import { motion, AnimatePresence } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { STAGES } from "../trace/stage-meta";
import { cn } from "@/lib/utils/cn";

export function AgentStatusIndicator() {
  const { streamingStatus, streamingSubStatus } = useChatStore();
  const shouldReduceMotion = useReducedMotion();

  if (streamingStatus === "idle" || streamingStatus === "done") return null;

  const activeIndex = STAGES.findIndex((s) => s.key === streamingStatus);
  const active = STAGES[activeIndex] ?? STAGES[0];

  return (
    <div className="mx-auto mb-2 w-full max-w-[760px] px-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={streamingStatus}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
          className="flex items-center gap-3 rounded-full border border-[var(--border-surface)] bg-[var(--bg-surface)] py-1.5 pl-1.5 pr-4 shadow-xs"
          role="status"
          aria-live="polite"
        >
          <div className="flex shrink-0 items-center gap-1">
            {STAGES.map((stage, i) => {
              const StageIcon = stage.icon;
              const isDone = i < activeIndex;
              const isActive = i === activeIndex;
              return (
                <span
                  key={stage.key}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                    isDone && "bg-[var(--status-success-bg)] text-[var(--status-success)]",
                    isActive && cn(stage.tile, "ring-2 ring-white shadow-sm"),
                    !isDone && !isActive && "bg-[var(--bg-subtle)] text-[var(--text-muted)]"
                  )}
                  title={stage.label}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : <StageIcon className="h-3.5 w-3.5" />}
                </span>
              );
            })}
          </div>

          <p className="min-w-0 flex-1 truncate text-[12px] text-[var(--text-secondary)]">
            <span className="font-medium text-ink">{active.label}</span>
            <span className="mx-1.5 text-[var(--border-strong)]">/</span>
            {streamingSubStatus || "Working…"}
          </p>

          <span className="relative flex h-2 w-2 shrink-0">
            <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", active.dot)} />
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", active.dot)} />
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
