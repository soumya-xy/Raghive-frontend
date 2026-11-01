"use client";

import React from "react";
import { ReasoningTrace } from "@/lib/api/types";
import { PlannerTraceSection } from "./planner-trace-section";
import { ExtractorTraceSection } from "./extractor-trace-section";
import { QATraceSection } from "./qa-trace-section";
import { useUIStore } from "@/lib/store/use-ui-store";
import { useChatStore } from "@/lib/store/use-chat-store";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Layers, PanelRightClose, PanelRightOpen } from "lucide-react";
import { TracePanelSkeleton } from "../shared/skeletons";
import { STAGES, StageKey } from "./stage-meta";
import { cn } from "@/lib/utils/cn";

interface TracePanelProps {
  trace: ReasoningTrace | null;
  isLoading?: boolean;
}

/** A paused (HITL) run only has a planner trace; the other stages never ran. */
function StageNotRun({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-2.5 text-[11px] text-[var(--text-muted)]">
      {label} did not run for this message.
    </div>
  );
}

/**
 * Right-hand agents panel. Collapsed, it is a slim rail showing each agent's
 * state; expanded, it docks at xl and slides over the chat below xl.
 */
export function TracePanel({ trace, isLoading = false }: TracePanelProps) {
  const { tracePanelOpen, setTracePanelOpen, activeTraceTab, setActiveTraceTab } = useUIStore();
  const streamingStatus = useChatStore((s) => s.streamingStatus);

  const openTab = (tab: typeof activeTraceTab) => {
    setActiveTraceTab(tab);
    setTracePanelOpen(true);
  };

  const rail = (
    <TraceRail
      trace={trace}
      running={streamingStatus === "idle" || streamingStatus === "done" ? null : streamingStatus}
      onOpen={openTab}
    />
  );

  if (!tracePanelOpen) return rail;

  return (
    <>
      {/* Keeps the chat width stable while the drawer floats over it below xl. */}
      <div className="hidden h-full sm:block xl:hidden">{rail}</div>
      <button
        aria-label="Close agents panel"
        onClick={() => setTracePanelOpen(false)}
        className="fixed inset-0 z-40 cursor-default bg-[#1f1d2b]/20 backdrop-blur-[1px] xl:hidden"
      />

      <aside
        aria-label="Agents panel"
        className="animate-slide-in fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden border-l border-[var(--border-surface)] bg-[var(--bg-surface)] shadow-lg sm:w-[400px] xl:static xl:z-auto xl:h-full xl:w-[384px] xl:shrink-0 xl:animate-none xl:shadow-none"
      >
        <div className="flex h-14 shrink-0 items-center justify-between pl-4 pr-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-ink">Agents</span>
            <span className="text-[12px] text-[var(--text-muted)]">reasoning trace</span>
          </div>
          <button
            onClick={() => setTracePanelOpen(false)}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-ink"
            title="Collapse agents panel (Ctrl+I)"
            aria-label="Collapse agents panel"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 px-4 pb-3">
          <Tabs value={activeTraceTab} onValueChange={(v) => setActiveTraceTab(v as typeof activeTraceTab)}>
            <TabsList className="grid h-9 w-full grid-cols-4 gap-1 rounded-full bg-[var(--bg-subtle)] p-1">
              {(["all", "planner", "extractor", "qa"] as const).map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="rounded-full text-[12px] text-[var(--text-muted)] data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-ink data-[state=active]:shadow-xs"
                >
                  {tab === "all" ? "All" : STAGES.find((s) => s.key === tab)!.short}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="flex-1 overflow-y-auto">
            <TracePanelSkeleton />
          </div>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
            {!trace && (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-primary-light)]">
                  <Layers className="h-5 w-5 text-[var(--accent-text)]" />
                </div>
                <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
                  Ask a question or select an answer to inspect its plan, evidence, and citations.
                </p>
              </div>
            )}

            {trace && (activeTraceTab === "all" || activeTraceTab === "planner") &&
              (trace.planner ? <PlannerTraceSection trace={trace.planner} /> : <StageNotRun label="Planner" />)}

            {trace && (activeTraceTab === "all" || activeTraceTab === "extractor") &&
              (trace.extractor ? <ExtractorTraceSection trace={trace.extractor} /> : <StageNotRun label="Extractor" />)}

            {trace && (activeTraceTab === "all" || activeTraceTab === "qa") &&
              (trace.qa ? <QATraceSection trace={trace.qa} /> : <StageNotRun label="QA" />)}
          </div>
        )}
      </aside>
    </>
  );
}

function TraceRail({
  trace,
  running,
  onOpen,
}: {
  trace: ReasoningTrace | null;
  running: StageKey | null;
  onOpen: (tab: "all" | StageKey) => void;
}) {
  return (
    <aside
      aria-label="Agents panel (collapsed)"
      className="flex h-full w-[60px] shrink-0 flex-col items-center gap-1 border-l border-[var(--border-surface)] bg-[var(--bg-sidebar)] py-3"
    >
      <button
        onClick={() => onOpen("all")}
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-ink hover:shadow-xs"
        title="Expand agents panel (Ctrl+I)"
        aria-label="Expand agents panel"
      >
        <PanelRightOpen className="h-4 w-4" />
      </button>

      {STAGES.map((stage) => {
        const Icon = stage.icon;
        const hasData = Boolean(trace?.[stage.key]);
        const isRunning = running === stage.key;
        return (
          <button
            key={stage.key}
            onClick={() => onOpen(stage.key)}
            className="group flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors hover:bg-[var(--bg-surface)]"
            title={`${stage.label}${isRunning ? " — running" : hasData ? " — has results" : ""}`}
            aria-label={`Open ${stage.label} trace`}
          >
            <span className={cn("relative flex h-9 w-9 items-center justify-center rounded-xl", stage.tile)}>
              <Icon className="h-4 w-4" />
              {(hasData || isRunning) && (
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                  {isRunning && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-70", stage.dot)} />}
                  <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-sidebar)]", stage.dot)} />
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium text-[var(--text-muted)] group-hover:text-ink">{stage.short}</span>
          </button>
        );
      })}
    </aside>
  );
}
