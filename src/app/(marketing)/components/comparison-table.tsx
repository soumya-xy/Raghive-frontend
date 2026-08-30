import React from "react";
import { Check, X, ShieldAlert } from "lucide-react";

export function ComparisonTable() {
  const rows = [
    {
      feature: "Explainability Type",
      naive: "None (Black Box)",
      advanced: "Post-Hoc Citations",
      raghive: "Glass-Box Saliency + NormEnsembleXAI",
    },
    {
      feature: "Error Detection",
      naive: "Manual User Checking",
      advanced: "LLM-as-a-Judge (Uncertain)",
      raghive: "Active Attention & Faithfulness Thresholds",
    },
    {
      feature: "Failure Handling",
      naive: "Silent Hallucination",
      advanced: "Generic Error Message",
      raghive: "Autonomous Self-Correction Loop",
    },
    {
      feature: "Vector Evidence Attribution",
      naive: "Cosine Similarity Only",
      advanced: "Reranker Scores",
      raghive: "Gradient + Leave-One-Out Ensembled",
    },
    {
      feature: "Counterfactual Verification",
      naive: "Not Supported",
      advanced: "Not Supported",
      raghive: "Entity Erasure Testing Enabled",
    },
    {
      feature: "Reliability Guarantee",
      naive: "Low Trust",
      advanced: "Moderate Trust",
      raghive: "Zero-Trust Verified Grounding",
    },
  ];

  return (
    <section className="py-24 bg-app">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            COMPREHENSIVE BENCHMARK
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mt-2">
            RAGHive vs Traditional RAG Architectures
          </h2>
          <p className="text-muted text-base mt-3">
            Why glass-box multi-agent verification outperforms black-box baseline models.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-surface bg-surface shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface bg-surface/80">
                <th className="p-5 font-mono text-xs text-muted uppercase">Architecture Metric</th>
                <th className="p-5 font-mono text-xs text-muted uppercase">Naive RAG</th>
                <th className="p-5 font-mono text-xs text-muted uppercase">Advanced Modular RAG</th>
                <th className="p-5 font-mono text-xs text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 font-bold border-x border-amber-500/30">
                  ⚡ RAGHive (Glass-Box)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface text-sm">
              {rows.map((r, idx) => (
                <tr key={idx} className="hover:bg-app/40 transition-colors">
                  <td className="p-5 font-semibold text-ink font-sans">{r.feature}</td>
                  <td className="p-5 text-muted font-mono text-xs flex items-center space-x-1.5">
                    <X className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{r.naive}</span>
                  </td>
                  <td className="p-5 text-muted font-mono text-xs flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{r.advanced}</span>
                  </td>
                  <td className="p-5 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border-x border-amber-500/30 flex items-center space-x-1.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{r.raghive}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
