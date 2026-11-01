import React from "react";
import { Check, Minus, X } from "lucide-react";
import { SectionHeading } from "./problem-section";

type Cell = string;

interface Row {
  feature: string;
  naive: Cell;
  modular: Cell;
  raghive: Cell;
}

const ROWS: Row[] = [
  {
    feature: "What you can inspect",
    naive: "Nothing — answer only",
    modular: "Sources added after generation",
    raghive: "Plan, chunks, scores, citations",
  },
  {
    feature: "Query handling",
    naive: "Single retrieval pass",
    modular: "Rewrite plus retrieve",
    raghive: "Dependent sub-questions",
  },
  {
    feature: "Evidence filtering",
    naive: "Top-k by similarity",
    modular: "Reranked top-k",
    raghive: "Similarity and attribution must both pass",
  },
  {
    feature: "When a stage fails",
    naive: "Answers anyway",
    modular: "Retries silently",
    raghive: "Retries once, then pauses for review",
  },
  {
    feature: "Citation meaning",
    naive: "None",
    modular: "Closest chunk by similarity",
    raghive: "Per-sentence chunk links (similarity-scored)",
  },
  {
    feature: "Grounding signal",
    naive: "None",
    modular: "Optional judge model",
    raghive: "Grounding score, erasure test, visible threshold",
  },
];

export function ComparisonTable() {
  return (
    <section id="benchmarks" className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
      <SectionHeading
        eyebrow="Comparison"
        title="Where the difference actually shows up."
        body="Described by behaviour, not adjectives. The last column is what this system does today."
      />

      <div className="mt-12 overflow-x-auto rounded-[28px] border border-[var(--border-surface)] bg-[var(--bg-surface)]">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--border-surface)]">
              <th className="px-5 py-4 text-[12px] font-medium text-[var(--text-muted)]">
                Behaviour
              </th>
              <th className="px-5 py-4 text-[12px] font-medium text-[var(--text-muted)]">
                Naive RAG
              </th>
              <th className="px-5 py-4 text-[12px] font-medium text-[var(--text-muted)]">
                Modular RAG
              </th>
              <th className="bg-[var(--accent-primary-light)] px-5 py-4 text-[12px] font-semibold text-[var(--accent-contrast)]">
                RAGHive
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-surface)]">
            {ROWS.map((row) => (
              <tr key={row.feature} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                <td className="px-5 py-4 text-[12px] font-medium text-ink">{row.feature}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-start gap-1.5 text-[12px] text-[var(--text-muted)]">
                    <X className="mt-0.5 h-3 w-3 shrink-0 text-[var(--coral)]" />
                    {row.naive}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-start gap-1.5 text-[12px] text-[var(--text-muted)]">
                    <Minus className="mt-0.5 h-3 w-3 shrink-0 text-[var(--text-muted)]" />
                    {row.modular}
                  </span>
                </td>
                <td className="bg-[var(--accent-primary-light)]/70 px-5 py-4">
                  <span className="inline-flex items-start gap-1.5 text-[13px] font-medium text-[var(--accent-contrast)]">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--accent-text)]" />
                    {row.raghive}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-[var(--text-muted)]">
        Citation links are chosen by embedding similarity between a sentence and each chunk; they show
        which evidence was nearest, not a verified entailment.
      </p>
    </section>
  );
}
