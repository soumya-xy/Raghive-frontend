import React from "react";
import { AlertTriangle, GitBranch, EyeOff, ClipboardCheck } from "lucide-react";

const PROBLEMS = [
  {
    icon: AlertTriangle,
    title: "Confident when it shouldn't be",
    description:
      "A model will write a fluent answer with no supporting evidence and no signal that something is missing.",
  },
  {
    icon: GitBranch,
    title: "Failures happen upstream",
    description:
      "If the query is decomposed badly, retrieval silently misses the right chunks and nothing raises an alarm.",
  },
  {
    icon: EyeOff,
    title: "Similarity is not influence",
    description:
      "A high cosine score says a chunk is close in meaning. It does not say the chunk shaped the answer.",
  },
  {
    icon: ClipboardCheck,
    title: "Citations added afterwards",
    description:
      "Many tools attach sources after generating text, so the citation describes the answer rather than supporting it.",
  },
];

export function SectionHeading({
  eyebrow,
  title,
  body,
  center = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <span className="inline-flex items-center rounded-full border border-[var(--border-surface)] bg-[var(--bg-surface)] px-3 py-1 text-[12px] font-medium text-[var(--text-secondary)]">
        {eyebrow}
      </span>
      <h2 className="mt-4 font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[44px]">
        {title}
      </h2>
      {body && <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">{body}</p>}
    </div>
  );
}

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
      <SectionHeading
        eyebrow="The problem"
        title={
          <>
            Retrieval is easy to demo and <em className="font-normal italic text-[var(--status-danger)]">hard to trust</em>.
          </>
        }
        body="Four failure modes show up again and again when a system is used for research rather than conversation."
      />

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROBLEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="group rounded-3xl border border-[var(--border-surface)] bg-[var(--bg-surface)] p-6 transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--status-danger-bg)] text-[var(--status-danger)]">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-[15px] font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
