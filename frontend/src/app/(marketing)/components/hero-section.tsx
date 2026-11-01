"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, Check, Compass, Filter, ShieldCheck, X } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { HexMark } from "@/components/shared/hex-mark";
import { cn } from "@/lib/utils/cn";

const STAGES = [
  {
    key: "plan",
    label: "Planner",
    icon: Compass,
    detail: "3 steps · entity coverage passed",
    tile: "bg-[var(--accent-primary-light)] text-[var(--accent-text)]",
    ring: "ring-[var(--accent-primary)]",
  },
  {
    key: "docs",
    label: "Extractor",
    icon: Filter,
    detail: "12 candidates · 5 kept",
    tile: "bg-[var(--mint)] text-[var(--accent-secondary-text)]",
    ring: "ring-[var(--accent-secondary)]",
  },
  {
    key: "qa",
    label: "QA",
    icon: ShieldCheck,
    detail: "grounding 0.86 · 4 citations",
    tile: "bg-[var(--cream)] text-[var(--cream-text)]",
    ring: "ring-[#f0b45e]",
  },
] as const;

const STATS = [
  { value: "3", label: "agents", cls: "bg-[var(--accent-primary-light)] text-[var(--accent-contrast)]" },
  { value: "4", label: "plan checks", cls: "bg-[var(--mint)] text-[var(--accent-secondary-text)]" },
  { value: "1", label: "trace per answer", cls: "bg-[var(--cream)] text-[var(--cream-text)]" },
];

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % STAGES.length), 2400);
    return () => clearInterval(timer);
  }, [shouldReduceMotion]);

  return (
    <section className="relative overflow-hidden">
      <div className="bg-pastel-mesh pointer-events-none absolute inset-0" />
      <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_50%_at_50%_30%,black,transparent)]" />

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-36 lg:px-8 lg:pt-44">
        <div className="mx-auto max-w-3xl text-center">
          <span className="animate-fade-up glass inline-flex items-center gap-2 rounded-full border border-white/80 px-3.5 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)]" />
            Explainable multi-agent RAG
          </span>

          <h1 className="animate-fade-up delay-100 mt-6 font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[64px] lg:text-[76px]">
            See <em className="font-normal italic text-[var(--accent-text)]">why</em> the answer
            <br className="hidden sm:block" /> is what it <span className="marker">is</span>.
          </h1>

          <p className="animate-fade-up delay-200 mx-auto mt-6 max-w-[52ch] text-[16px] leading-relaxed text-[var(--text-secondary)]">
            RAGHive plans the question, retrieves evidence, verifies each stage, and shows you the whole
            trace — the plan, the chunks, the scores, and the citations — before you trust the answer.
          </p>

          <div className="animate-fade-up delay-300 mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/sign-up"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-6 text-[14px] font-semibold text-[var(--accent-contrast)] shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5 hover:bg-[var(--accent-primary-hover)]"
            >
              Start asking
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/#trace"
              className="glass inline-flex h-12 items-center rounded-full border border-[var(--border-surface)] px-6 text-[14px] font-medium text-ink transition-colors hover:bg-white"
            >
              See the trace
            </Link>
          </div>

          <ul className="animate-fade-up delay-300 mt-8 flex flex-wrap items-center justify-center gap-2">
            {STATS.map((s) => (
              <li key={s.label} className={cn("rounded-full px-3 py-1 text-[12px]", s.cls)}>
                <span className="font-semibold tabular">{s.value}</span> {s.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Product mock */}
        <div className="animate-fade-up delay-300 relative mx-auto mt-16 max-w-5xl">
          <div className="glass rounded-[30px] border border-white/80 p-2 shadow-lg">
            <div className="grid overflow-hidden rounded-[24px] border border-[var(--border-surface)] bg-[var(--bg-surface)] md:grid-cols-[1fr_300px]">
              {/* Chat */}
              <div className="flex flex-col gap-5 p-5 sm:p-7">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--coral)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f5d8a8]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--mint)]" />
                </div>

                <div className="ml-auto max-w-[80%] rounded-[18px] rounded-br-md bg-[var(--accent-primary-light)] px-4 py-2.5 text-left text-[13px] text-[var(--accent-contrast)]">
                  Who directed Inception, and what is their latest film?
                </div>

                <div className="flex gap-3 text-left">
                  <HexMark size="md" />
                  <div className="min-w-0 flex-1 space-y-3">
                    <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      Inception was directed by Christopher Nolan.
                      <sup className="ml-0.5 rounded bg-[var(--accent-primary-light)] px-1 text-[9px] font-semibold text-[var(--accent-text)]">2</sup>{" "}
                      His latest release is Oppenheimer.
                      <sup className="ml-0.5 rounded bg-[var(--accent-primary-light)] px-1 text-[9px] font-semibold text-[var(--accent-text)]">1</sup>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[var(--accent-primary-light)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-text)]">Plan passed</span>
                      <span className="rounded-full bg-[var(--mint)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-secondary-text)]">5 chunks kept</span>
                      <span className="rounded-full bg-[var(--status-success-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--status-success)]">86% grounding</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2 rounded-full border border-[var(--border-surface)] py-1.5 pl-4 pr-1.5 shadow-xs">
                  <span className="flex-1 text-left text-[12px] text-[var(--text-muted)]">Ask anything about your documents…</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--accent-contrast)]">
                    <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </span>
                </div>
              </div>

              {/* Agents rail */}
              <div className="border-t border-[var(--border-surface)] bg-[var(--bg-sidebar)] p-4 md:border-l md:border-t-0">
                <p className="mb-3 text-left text-[12px] font-semibold text-ink">
                  Agents <span className="font-normal text-[var(--text-muted)]">· live trace</span>
                </p>
                <div className="space-y-2">
                  {STAGES.map((stage, i) => {
                    const Icon = stage.icon;
                    const isActive = i === active;
                    const isDone = i < active;
                    return (
                      <div
                        key={stage.key}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border bg-[var(--bg-surface)] p-3 text-left transition-all duration-300",
                          isActive ? cn("border-transparent shadow-md ring-2", stage.ring) : "border-[var(--border-surface)]"
                        )}
                      >
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", stage.tile)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-ink">{stage.label}</p>
                          <p className="truncate text-[11px] text-[var(--text-muted)]">{stage.detail}</p>
                        </div>
                        {isDone && <Check className="h-3.5 w-3.5 text-[var(--status-success)]" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Floating evidence notes */}
          <div className="animate-float absolute -left-14 top-[68px] hidden items-center gap-2 rounded-2xl border border-[var(--status-danger-border)] bg-white px-3 py-2 shadow-lg lg:flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--status-danger-bg)] text-[var(--status-danger)]">
              <X className="h-3.5 w-3.5" />
            </span>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-ink">Chunk filtered</p>
              <p className="tabular text-[10px] text-[var(--text-muted)]">attribution 0.41 &lt; 0.48</p>
            </div>
          </div>
          <div className="animate-float absolute -right-8 bottom-16 hidden items-center gap-2 rounded-2xl border border-[var(--accent-secondary-border)] bg-white px-3 py-2 shadow-lg [animation-delay:1.5s] lg:flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--mint)] text-[var(--accent-secondary-text)]">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-ink">Grounded</p>
              <p className="tabular text-[10px] text-[var(--text-muted)]">0.86 · 4 citations</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
