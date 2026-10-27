import React from "react";
import { Compass, Filter, ShieldCheck } from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    {
      stepNum: "01",
      agent: "Planner Agent",
      icon: Compass,
      accentColor: "amber",
      title: "Decompose & Verify Attention",
      description:
        "Extracts query keywords using spaCy/NER, decomposes into sub-questions, and runs an attention focus pass. Retries automatically if keyword attention fails.",
      verificationChip: "Attention Focus Matrix Check",
    },
    {
      stepNum: "02",
      agent: "Extractor Agent",
      icon: Filter,
      accentColor: "teal",
      title: "Vector Search & NormEnsembleXAI",
      description:
        "Searches ChromaDB per sub-question and scores chunks with ensembled gradient + leave-one-out attribution. Filters low-importance chunks out.",
      verificationChip: "Attribution Score Threshold Filter",
    },
    {
      stepNum: "03",
      agent: "QA / Reasoning Agent",
      icon: ShieldCheck,
      accentColor: "emerald",
      title: "Grounded Synthesis & Citation Map",
      description:
        "Synthesizes answer solely from verified chunks, calculates Faithfulness Score, and outputs a token/sentence citation heatmap with entity erasure testing.",
      verificationChip: "Faithfulness & Erasure Verification",
    },
  ];

  return (
    <section className="py-24 bg-app">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            GLASS-BOX PIPELINE
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mt-2">
            How RAGHive Verifies Before It Speaks
          </h2>
          <p className="text-muted text-base mt-3">
            Three autonomous agents working in a transparent pipeline with continuous self-checking loops.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative p-8 rounded-2xl border border-surface bg-surface space-y-4 hover:shadow-xl transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      item.accentColor === "amber"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        : item.accentColor === "teal"
                        ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-2xl font-bold text-muted/40 group-hover:text-amber-500/60 transition-colors">
                    {item.stepNum}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-mono font-semibold text-muted uppercase">
                    {item.agent}
                  </span>
                  <h3 className="font-display font-semibold text-xl text-ink mt-1">
                    {item.title}
                  </h3>
                </div>

                <p className="text-xs text-muted leading-relaxed">{item.description}</p>

                <div className="pt-3 border-t border-surface">
                  <span className="inline-block text-[11px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                    ✅ {item.verificationChip}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
