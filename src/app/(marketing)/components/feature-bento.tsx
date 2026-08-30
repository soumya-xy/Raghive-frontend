import React from "react";
import { ShieldCheck, RefreshCw, BarChart2, FileSearch, Flame, Cpu } from "lucide-react";

export function FeatureBento() {
  return (
    <section className="py-24 bg-surface/30 border-t border-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            FEATURE ARCHITECTURE
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mt-2">
            Built for Zero-Trust AI Rigor
          </h2>
          <p className="text-muted text-base mt-3">
            Every feature engineered to eliminate black-box guesswork and prove answer validity.
          </p>
        </div>

        {/* Asymmetric Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Glass-Box Pipeline (Large Span) */}
          <div className="md:col-span-2 p-8 rounded-3xl border border-surface bg-surface hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 shadow-sm">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider">
                Glass-Box Pipeline
              </span>
            </div>
            <div>
              <h3 className="font-display font-bold text-2xl text-ink">
                Complete Internal Saliency & Reasoning Inspection
              </h3>
              <p className="text-sm text-muted mt-2 leading-relaxed max-w-xl">
                Instead of hiding behind a spinner, RAGHive streams its Planner steps, vector evidence chunk attribution scores, and QA faithfulness matrix directly to your side-panel in real time.
              </p>
            </div>
            <div className="p-3 rounded-xl border border-surface bg-app text-xs font-mono text-amber-600 dark:text-amber-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Inspect raw attention weights & evidence attribution per sentence.</span>
            </div>
          </div>

          {/* Card 2: Self-Correction Loop */}
          <div className="p-8 rounded-3xl border border-surface bg-surface hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 shadow-sm">
            <div className="flex items-center space-x-3 text-teal-600 dark:text-teal-400">
              <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider">
                Self-Correction
              </span>
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-ink">
                Autonomous Verification Retries
              </h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                If the Planner Agent fails attention focus on key domain entities, it silently triggers a corrective re-decomposition before vector retrieval.
              </p>
            </div>
          </div>

          {/* Card 3: NormEnsembleXAI */}
          <div className="p-8 rounded-3xl border border-surface bg-surface hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 shadow-sm">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <BarChart2 className="w-6 h-6" />
              </div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider">
                NormEnsembleXAI
              </span>
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-ink">
                Ensembled Attribution Scoring
              </h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Combines normalized integrated gradients with leave-one-out token erasure to score true document importance.
              </p>
            </div>
          </div>

          {/* Card 4: Citation Heatmaps */}
          <div className="p-8 rounded-3xl border border-surface bg-surface hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 shadow-sm">
            <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Flame className="w-6 h-6" />
              </div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider">
                Citation Heatmaps
              </span>
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-ink">
                Sentence-to-Chunk Hover Map
              </h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Hover any sentence in the synthesized answer to instantly highlight its exact supporting document evidence chunk.
              </p>
            </div>
          </div>

          {/* Card 5: Faithfulness Score & Erasure Test */}
          <div className="p-8 rounded-3xl border border-surface bg-surface hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 shadow-sm">
            <div className="flex items-center space-x-3 text-teal-600 dark:text-teal-400">
              <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <FileSearch className="w-6 h-6" />
              </div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider">
                Erasure Testing
              </span>
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-ink">
                Counterfactual Entity Masking
              </h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Masks query keywords to test if the model's answer changes, detecting ungrounded parametric hallucinations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
