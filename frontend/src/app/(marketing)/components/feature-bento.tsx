import React from "react";
import { ShieldCheck, RefreshCw, Layers, Link2, FileSearch, MessageSquareDiff } from "lucide-react";
import { SectionHeading } from "./problem-section";
import { cn } from "@/lib/utils/cn";

const FEATURES = [
  {
    icon: Layers,
    title: "Streamed reasoning",
    description: "Planner steps, retrieved chunks, and scores arrive while the answer is still being written.",
    span: "sm:col-span-2",
    card: "bg-[var(--accent-primary-light)]",
    tile: "bg-white text-[var(--accent-text)]",
    visual: "stream",
  },
  {
    icon: RefreshCw,
    title: "One automatic retry",
    description: "A failed plan is regenerated once with corrective feedback before anything is shown as final.",
    span: "",
    card: "bg-[var(--cream)]",
    tile: "bg-white text-[var(--cream-text)]",
  },
  {
    icon: MessageSquareDiff,
    title: "Human review",
    description: "If the plan fails twice, the pipeline pauses. Approve it, edit the steps, or regenerate.",
    span: "",
    card: "bg-[var(--mint)]",
    tile: "bg-white text-[var(--accent-secondary-text)]",
  },
  {
    icon: Link2,
    title: "Sentence citations",
    description: "Every sentence links to the evidence chunks it drew from. Hover to highlight them in the trace.",
    span: "",
    card: "bg-[var(--bg-surface)] border border-[var(--border-surface)]",
    tile: "bg-[var(--accent-primary-light)] text-[var(--accent-text)]",
  },
  {
    icon: ShieldCheck,
    title: "Grounding check",
    description: "The answer is scored against the evidence, with a visible warning when it falls below the bar.",
    span: "",
    card: "bg-[var(--status-danger-bg)]",
    tile: "bg-white text-[var(--status-danger)]",
    visual: "meter",
  },
  {
    icon: FileSearch,
    title: "Erasure test",
    description: "Query entities are masked to see whether the answer still holds without them.",
    span: "lg:col-span-3",
    card: "bg-[var(--bg-surface)] border border-[var(--border-surface)]",
    tile: "bg-[var(--mint)] text-[var(--accent-secondary-text)]",
    visual: "erasure",
  },
];

function StreamVisual() {
  const rows = [
    { w: "w-[72%]", c: "bg-[var(--accent-primary)]" },
    { w: "w-[54%]", c: "bg-[#9cc5bf]" },
    { w: "w-[86%]", c: "bg-[#f0c88e]" },
    { w: "w-[40%]", c: "bg-[var(--accent-primary)]" },
  ];
  return (
    <div className="mt-6 space-y-2 rounded-2xl bg-white/70 p-4">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", r.c)} />
          <span className={cn("h-2 rounded-full opacity-70", r.w, r.c)} />
        </div>
      ))}
    </div>
  );
}

function MeterVisual() {
  return (
    <div className="mt-6 rounded-2xl bg-white/80 p-3">
      <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
        <span>grounding</span>
        <span className="tabular">bar 0.70</span>
      </div>
      <div className="relative mt-1.5 h-2 rounded-full bg-[var(--bg-subtle)]">
        <div className="h-full w-[62%] rounded-full bg-[var(--coral)]" />
        <span className="absolute top-[-3px] h-[14px] w-[2px] rounded bg-ink" style={{ left: "70%" }} />
      </div>
    </div>
  );
}

function ErasureVisual() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      <span className="rounded-full bg-[var(--bg-subtle)] px-3 py-1.5 text-[var(--text-secondary)]">
        Who directed <span className="inline-block h-3 w-16 rounded-sm bg-[var(--text-ink)] align-middle" role="img" aria-label="masked entity" />?
      </span>
      <span className="text-[var(--text-muted)]">→</span>
      <span className="rounded-full bg-[var(--mint)] px-3 py-1.5 font-medium text-[var(--accent-secondary-text)]">
        answer similarity 0.91 · holds
      </span>
    </div>
  );
}

export function FeatureBento() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading eyebrow="What you get" title="A trace, not a promise." />
        <p className="max-w-sm text-[14px] leading-relaxed text-[var(--text-secondary)]">
          Each feature below is something you can inspect on a real answer — not a badge on a landing page.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((item) => {
          const Icon = item.icon;
          const isWide = item.visual === "erasure";
          return (
            <div
              key={item.title}
              className={cn(
                "rounded-[28px] p-7 transition-all hover:-translate-y-1 hover:shadow-md",
                item.span,
                item.card,
                isWide && "sm:col-span-2 lg:flex lg:items-center lg:justify-between lg:gap-10"
              )}
            >
              <div className={isWide ? "max-w-md" : undefined}>
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs", item.tile)}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-5 font-display text-[20px] font-semibold tracking-[-0.02em] text-ink">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
              </div>
              {item.visual === "stream" && <StreamVisual />}
              {item.visual === "meter" && <MeterVisual />}
              {isWide && (
                <div className="mt-6 lg:mt-0">
                  <ErasureVisual />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
