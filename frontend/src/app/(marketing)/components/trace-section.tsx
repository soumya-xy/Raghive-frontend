import React from "react";
import { Compass, Filter, ShieldCheck, Check, Minus } from "lucide-react";
import { SectionHeading } from "./problem-section";

const PLANNER_STEPS = ["Who directed Inception?", "What is that director's latest film?"];

const CHUNKS = [
  { source: "Nolan filmography", page: 1, similarity: 0.91, attribution: 0.88, kept: true },
  { source: "Premiere coverage", page: 1, similarity: 0.74, attribution: 0.41, kept: false },
  { source: "Oppenheimer release", page: 2, similarity: 0.86, attribution: 0.79, kept: true },
];

const CHECKS = [
  { label: "Entity coverage", status: "pass" },
  { label: "Requirement coverage", status: "pass" },
  { label: "Self-consistency", status: "pass" },
  { label: "Attention grounding", status: "not run" },
];

function StageHeader({
  icon: Icon,
  label,
  tile,
  right,
}: {
  icon: React.ElementType;
  label: string;
  tile: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 pt-3.5">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tile}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <span className="ml-auto">{right}</span>
    </div>
  );
}

export function TraceSection() {
  return (
    <section id="trace" className="px-4">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[36px] border border-[var(--border-surface)] bg-[var(--bg-surface)] px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="The trace"
              title="The panel you actually work in."
              body="This is a reduced view of a real trace. Each panel is a stage; each row is a decision the system made and the number behind it."
            />

            <ul className="mt-8 space-y-3">
              {[
                "Checks that did not run are labelled, not hidden.",
                "Filtered chunks stay visible with the reason they were dropped.",
                "Every metric is paired with how it was computed.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-[14px] text-[var(--text-secondary)]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary-light)]">
                    <Check className="h-3 w-3 text-[var(--accent-text)]" />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* Example trace */}
          <div className="relative">
            <div className="bg-pastel-mesh pointer-events-none absolute -inset-6 rounded-[40px] opacity-80" />
            <div className="relative space-y-3 rounded-[28px] border border-[var(--border-surface)] bg-[var(--bg-sidebar)] p-3 shadow-lg">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-[13px] font-semibold text-ink">Agents</span>
                <div className="flex gap-1 rounded-full bg-[var(--bg-subtle)] p-1">
                  {["All", "Plan", "Docs", "QA"].map((tab, i) => (
                    <span
                      key={tab}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                        i === 0 ? "bg-[var(--bg-surface)] text-ink shadow-xs" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
              </div>

              {/* Planner */}
              <div className="rounded-2xl border border-[var(--border-surface)] bg-[var(--bg-surface)] pb-3">
                <StageHeader
                  icon={Compass}
                  label="Planner"
                  tile="bg-[var(--accent-primary-light)] text-[var(--accent-text)]"
                  right={
                    <span className="rounded-full bg-[var(--status-success-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--status-success)]">
                      3 of 3 run checks passed
                    </span>
                  }
                />
                <div className="px-3.5 pt-3">
                  <ol className="space-y-1.5">
                    {PLANNER_STEPS.map((step, i) => (
                      <li key={step} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
                        <span className="tabular flex h-[18px] w-[18px] items-center justify-center rounded-md bg-[var(--bg-subtle)] text-[10px]">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {CHECKS.map((check) => (
                      <div
                        key={check.label}
                        className="flex items-center justify-between rounded-lg bg-[var(--bg-subtle)] px-2 py-1"
                      >
                        <span className="truncate text-[11px] text-[var(--text-secondary)]">{check.label}</span>
                        {check.status === "pass" ? (
                          <Check className="h-3 w-3 shrink-0 text-[var(--status-success)]" />
                        ) : (
                          <Minus className="h-3 w-3 shrink-0 text-[var(--text-muted)]" aria-label="not run" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Extractor */}
              <div className="rounded-2xl border border-[var(--border-surface)] bg-[var(--bg-surface)] pb-3">
                <StageHeader
                  icon={Filter}
                  label="Extractor"
                  tile="bg-[var(--mint)] text-[var(--accent-secondary-text)]"
                  right={<span className="tabular text-[11px] text-[var(--text-muted)]">2 / 3 kept</span>}
                />
                <div className="space-y-1.5 px-3.5 pt-3">
                  {CHUNKS.map((chunk) => (
                    <div
                      key={chunk.source}
                      className={`rounded-xl border px-2.5 py-2 ${
                        chunk.kept
                          ? "border-[var(--border-surface)]"
                          : "border-dashed border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12px] text-ink">
                          {chunk.source}
                          <span className="text-[var(--text-muted)]"> · p.{chunk.page}</span>
                        </span>
                        <span
                          className={`rounded-full px-1.5 text-[10px] font-medium ${
                            chunk.kept
                              ? "bg-[var(--status-success-bg)] text-[var(--status-success)]"
                              : "text-[var(--status-danger)]"
                          }`}
                        >
                          {chunk.kept ? "kept" : "filtered"}
                        </span>
                      </div>
                      <div className="mt-1.5 flex gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-[var(--bg-subtle)]">
                          <div className="h-full rounded-full bg-[var(--accent-secondary)]" style={{ width: `${chunk.similarity * 100}%` }} />
                        </div>
                        <div className="h-1.5 flex-1 rounded-full bg-[var(--bg-subtle)]">
                          <div className="h-full rounded-full bg-[var(--accent-primary)]" style={{ width: `${chunk.attribution * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-3 pt-1 text-[10px] text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-3 rounded-full bg-[var(--accent-secondary)]" /> similarity
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-3 rounded-full bg-[var(--accent-primary)]" /> attribution
                    </span>
                  </div>
                </div>
              </div>

              {/* QA */}
              <div className="rounded-2xl border border-[var(--border-surface)] bg-[var(--bg-surface)] pb-3.5">
                <StageHeader
                  icon={ShieldCheck}
                  label="QA"
                  tile="bg-[var(--cream)] text-[var(--cream-text)]"
                  right={<span className="tabular text-[11px] font-medium text-[var(--status-success)]">86% grounded</span>}
                />
                <p className="px-3.5 pt-2.5 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  Inception was directed by Christopher Nolan.
                  <sup className="ml-0.5 rounded bg-[var(--accent-primary-light)] px-1 text-[9px] font-semibold text-[var(--accent-text)]">2</sup>{" "}
                  His latest release is Oppenheimer.
                  <sup className="ml-0.5 rounded bg-[var(--accent-primary-light)] px-1 text-[9px] font-semibold text-[var(--accent-text)]">1</sup>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
