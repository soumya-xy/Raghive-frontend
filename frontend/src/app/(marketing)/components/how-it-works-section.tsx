import React from "react";
import { Compass, Filter, ShieldCheck } from "lucide-react";
import { SectionHeading } from "./problem-section";
import { cn } from "@/lib/utils/cn";

const STEPS = [
  {
    step: "01",
    agent: "Planner",
    icon: Compass,
    title: "Break the question down",
    description:
      "The question is split into dependent sub-questions. Reference entities are extracted and checked against the plan, along with consistency across repeated attempts.",
    checks: ["Entity coverage", "Requirement coverage", "Self-consistency"],
    card: "bg-[var(--accent-primary-light)]",
    ink: "text-[var(--accent-text)]",
    num: "text-[var(--accent-primary)]",
  },
  {
    step: "02",
    agent: "Extractor",
    icon: Filter,
    title: "Retrieve, then score twice",
    description:
      "Each sub-question retrieves candidates through hybrid search. A chunk is kept only when it clears both a similarity bar and an attribution bar.",
    checks: ["Hybrid retrieval", "Cross-encoder rank", "Dual-score filter"],
    card: "bg-[var(--mint)]",
    ink: "text-[var(--accent-secondary-text)]",
    num: "text-[#9cc5bf]",
  },
  {
    step: "03",
    agent: "QA",
    icon: ShieldCheck,
    title: "Answer from evidence only",
    description:
      "The answer is generated from kept chunks alone, then checked for grounding, mapped to sentence-level citations, and tested with query-entity masking.",
    checks: ["Grounding score", "Sentence citations", "Erasure test"],
    card: "bg-[var(--cream)]",
    ink: "text-[var(--cream-text)]",
    num: "text-[#f0c88e]",
  },
];

export function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
      <SectionHeading
        center
        eyebrow="How it works"
        title="Three agents, each with something to prove."
        body="Every stage has an explicit check. If a check fails, you see it — and the planner pauses for review rather than continuing quietly."
      />

      <ol className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
        {STEPS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.step} className={cn("relative overflow-hidden rounded-[28px] p-7", item.card)}>
              <span
                className={cn(
                  "pointer-events-none absolute right-5 top-3 font-display text-[88px] font-semibold leading-none opacity-70",
                  item.num
                )}
                aria-hidden="true"
              >
                {item.step}
              </span>

              <span className={cn("relative inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[12px] font-semibold", item.ink)}>
                <Icon className="h-3.5 w-3.5" />
                {item.agent}
              </span>

              <h3 className="relative mt-10 font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                {item.title}
              </h3>
              <p className="relative mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">{item.description}</p>

              <ul className="relative mt-6 flex flex-wrap gap-1.5">
                {item.checks.map((check) => (
                  <li key={check} className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                    {check}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
