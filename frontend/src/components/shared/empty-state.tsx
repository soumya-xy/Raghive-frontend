"use client";

import React from "react";
import { HexMark } from "./hex-mark";
import { Compass, Filter, ShieldCheck, Sparkles } from "lucide-react";

interface EmptyStateProps {
  onSelectPrompt: (promptText: string) => void;
}

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const examplePrompts = [
    {
      title: "Multi-Hop Query Reasoning",
      prompt: "Who is the director of Inception and what is their latest movie?",
      agent: "Planner + Extractor",
      icon: Compass,
    },
    {
      title: "Domain Technical Verification",
      prompt: "What are the security standards for cyber-physical power grids?",
      agent: "Self-Correction Loop",
      icon: Filter,
    },
    {
      title: "Explainable Attribution Trace",
      prompt: "Explain how NormEnsembleXAI works in RAGHive.",
      agent: "Attribution Heatmap",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto px-4 text-center">
      <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
        <HexMark size="xl" glow />
      </div>

      <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-ink mb-2">
        Ask anything. Watch RAGHive show its work.
      </h2>
      <p className="text-muted text-sm md:text-base mb-8 max-w-lg">
        Every step, keyword extraction, vector evidence chunk score, and sentence citation is
        transparently verified before you see the final answer.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full text-left">
        {examplePrompts.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group p-4 rounded-xl border border-surface bg-surface hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-left flex flex-col justify-between cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono tracking-wider text-amber-600 dark:text-amber-400 uppercase">
                    {item.agent}
                  </span>
                  <Icon className="w-4 h-4 text-muted group-hover:text-amber-500 transition-colors" />
                </div>
                <p className="font-medium text-sm text-ink group-hover:text-amber-500 transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-muted mt-1 line-clamp-2">{item.prompt}</p>
              </div>
              <div className="mt-3 flex items-center text-xs font-medium text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Run with reasoning trace</span>
                <Sparkles className="w-3 h-3 ml-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
