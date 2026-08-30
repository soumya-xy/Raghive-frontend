import React from "react";
import { AlertTriangle, HelpCircle, ShieldX, EyeOff } from "lucide-react";

export function ProblemSection() {
  const problems = [
    {
      icon: AlertTriangle,
      title: "Confident Hallucinations",
      description:
        "Standard LLMs generate eloquent responses even when document evidence is completely missing, leading users into false trust.",
    },
    {
      icon: ShieldX,
      title: "Silent Error Cascades",
      description:
        "When the initial query planner fails to capture critical domain keywords, retrieval fails downstream without throwing any alert.",
    },
    {
      icon: EyeOff,
      title: "Opaque Vector Search",
      description:
        "Cosine similarity measures closeness of text, but does NOT tell you whether a chunk was actually influential in the final answer.",
    },
    {
      icon: HelpCircle,
      title: "Post-Hoc Explanations",
      description:
        "Generic chatbot wrappers generate citations after the fact, hoping they sound convincing without verifying grounding during synthesis.",
    },
  ];

  return (
    <section className="py-20 bg-surface/40 border-y border-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink">
            The Black Box Problem in Naive RAG
          </h2>
          <p className="text-muted text-base mt-3">
            Why mission-critical decisions in legal, scientific, and industrial systems cannot rely
            on opaque AI models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-surface bg-surface hover:border-amber-500/30 transition-all space-y-3 shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-lg text-ink">{item.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
