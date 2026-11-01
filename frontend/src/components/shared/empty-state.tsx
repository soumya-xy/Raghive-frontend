"use client";

import React from "react";
import { HexMark } from "./hex-mark";
import { Compass, Filter, ShieldCheck, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  onSelectPrompt: (promptText: string) => void;
}

const examplePrompts = [
  {
    title: "Multi-hop reasoning",
    prompt: "Who is the director of Inception and what is their latest movie?",
    icon: Compass,
    tile: "bg-[var(--accent-primary-light)] text-[var(--accent-text)]",
  },
  {
    title: "Technical verification",
    prompt: "What are the security standards for cyber-physical power grids?",
    icon: Filter,
    tile: "bg-[var(--mint)] text-[var(--accent-secondary-text)]",
  },
  {
    title: "Attribution trace",
    prompt: "Explain how NormEnsembleXAI works in RAGHive.",
    icon: ShieldCheck,
    tile: "bg-[var(--cream)] text-[var(--cream-text)]",
  },
];

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10">
      <div className="mx-auto flex w-full max-w-[720px] flex-col items-center text-center">
        <HexMark size="xl" glow className="mb-6" />

        <h2 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-ink md:text-[36px]">
          What should we <span className="marker">investigate</span>?
        </h2>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[var(--text-muted)]">
          Three agents plan, retrieve, and verify. You see every step.
        </p>

        <div className="mt-9 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {examplePrompts.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                onClick={() => onSelectPrompt(item.prompt)}
                className="group flex flex-col gap-4 rounded-2xl border border-[var(--border-surface)] bg-[var(--bg-surface)] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
              >
                <div className="flex items-center justify-between">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", item.tile)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[var(--text-muted)]">{item.prompt}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
