"use client";

import React from "react";
import { ReasoningTrace } from "@/lib/api/types";
import { PlannerTraceSection } from "./planner-trace-section";
import { ExtractorTraceSection } from "./extractor-trace-section";
import { QATraceSection } from "./qa-trace-section";
import { useUIStore } from "@/lib/store/use-ui-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { X, Layers, Compass, Filter, ShieldCheck } from "lucide-react";
import { TracePanelSkeleton } from "../shared/skeletons";

interface TracePanelProps {
  trace: ReasoningTrace | null;
  isLoading?: boolean;
}

export function TracePanel({ trace, isLoading = false }: TracePanelProps) {
  const { toggleTracePanel, activeTraceTab, setActiveTraceTab } = useUIStore();

  if (isLoading) {
    return (
      <aside className="w-full lg:w-96 border-l border-surface bg-surface/50 h-full overflow-y-auto">
        <TracePanelSkeleton />
      </aside>
    );
  }

  if (!trace) {
    return (
      <aside className="w-full lg:w-96 border-l border-surface bg-surface/30 h-full p-6 flex flex-col items-center justify-center text-center text-muted">
        <Layers className="w-8 h-8 text-amber-500/40 mb-3 animate-pulse" />
        <h4 className="font-display font-semibold text-sm text-ink mb-1">
          No Active Reasoning Trace
        </h4>
        <p className="text-xs max-w-xs">
          Select any assistant response in the conversation to inspect its Planner, Extractor, and QA verification pipeline.
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-full lg:w-96 border-l border-surface bg-surface/40 h-full flex flex-col overflow-hidden">
      {/* Panel Top Bar */}
      <div className="p-4 border-b border-surface flex items-center justify-between bg-surface">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <h3 className="font-display font-semibold text-sm text-ink">
            Live Reasoning Trace
          </h3>
        </div>
        <button
          onClick={toggleTracePanel}
          className="p-1 rounded-lg text-muted hover:text-ink hover:bg-amber-500/10 cursor-pointer transition-colors"
          title="Close trace panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Filter Header */}
      <div className="p-2 border-b border-surface bg-surface/60">
        <Tabs value={activeTraceTab} onValueChange={(v: any) => setActiveTraceTab(v)}>
          <TabsList className="w-full grid grid-cols-4 gap-1 h-8">
            <TabsTrigger value="all" className="text-[11px] font-mono">
              All
            </TabsTrigger>
            <TabsTrigger value="planner" className="text-[11px] font-mono flex items-center">
              <Compass className="w-3 h-3 mr-1 text-amber-500" />
              Plan
            </TabsTrigger>
            <TabsTrigger value="extractor" className="text-[11px] font-mono flex items-center">
              <Filter className="w-3 h-3 mr-1 text-teal-500" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="qa" className="text-[11px] font-mono flex items-center">
              <ShieldCheck className="w-3 h-3 mr-1 text-emerald-500" />
              QA
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content Scroll Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTraceTab === "all" && (
          <>
            <PlannerTraceSection trace={trace.planner} />
            <ExtractorTraceSection trace={trace.extractor} />
            <QATraceSection trace={trace.qa} />
          </>
        )}
        {activeTraceTab === "planner" && <PlannerTraceSection trace={trace.planner} />}
        {activeTraceTab === "extractor" && <ExtractorTraceSection trace={trace.extractor} />}
        {activeTraceTab === "qa" && <QATraceSection trace={trace.qa} />}
      </div>
    </aside>
  );
}
