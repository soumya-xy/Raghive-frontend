"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { HexMark } from "@/components/shared/hex-mark";
import { Button } from "@/components/ui/button";
import { ArrowRight, Compass, Filter, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();
  const [stepActive, setStepActive] = useState<"planner" | "extractor" | "qa">("planner");
  const [score, setScore] = useState(82);

  // Animate demo score ticking up
  useEffect(() => {
    const timer = setInterval(() => {
      setStepActive((prev) => {
        if (prev === "planner") return "extractor";
        if (prev === "extractor") return "qa";
        return "planner";
      });
      setScore((s) => (s >= 96 ? 82 : s + 7));
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden bg-hex-grid">
      {/* Decorative Gradient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Pitch Tagline Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono font-medium shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Academic Research Project • Glass-Box Explainable RAG</span>
          </div>
        </div>

        {/* Hero Headline & Subheadline */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-ink leading-[1.1]">
            Every other AI answers you and hopes you trust it.{" "}
            <span className="text-amber-600 dark:text-amber-500 underline decoration-amber-500/40 decoration-wavy underline-offset-8">
              RAGHive shows its work.
            </span>
          </h1>

          <p className="text-muted text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Every step, scored and traceable, before the answer ever reaches you. Multi-agent
            planning, vector evidence attribution scoring, and sentence-level citation heatmaps.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild variant="amber" size="lg" className="w-full sm:w-auto font-semibold shadow-lg">
              <Link href="/auth/sign-up">
                <span>Start Free Glass-Box Trial</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-mono">
              <Link href="/app/chat">
                <span>See Live Trace Demo →</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Hero Central Mockup Component: Live Reasoning-Trace Visualizer */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="p-1 rounded-3xl bg-gradient-to-b from-amber-500/30 via-teal-500/20 to-surface border border-surface shadow-2xl overflow-hidden backdrop-blur-xl">
            <div className="bg-surface rounded-[22px] p-6 md:p-8 space-y-6">
              {/* Mock Topbar */}
              <div className="flex items-center justify-between border-b border-surface pb-4">
                <div className="flex items-center space-x-3">
                  <HexMark size="sm" glow />
                  <span className="font-display font-semibold text-sm text-ink">
                    RAGHive Glass-Box Agent Pipeline
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    LIVE TRACE ACTIVE ({score}%)
                  </span>
                </div>
              </div>

              {/* 3-Step Interactive Pipeline Flow Visualizer */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                {/* Connector glow line */}
                <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-teal-500 to-emerald-500 -translate-y-1/2 opacity-30 z-0" />

                {/* Step 1: Planner */}
                <motion.div
                  animate={{
                    borderColor: stepActive === "planner" ? "#D97706" : "var(--border-surface)",
                    scale: stepActive === "planner" ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10 p-4 rounded-xl border bg-app/80 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                    <div className="flex items-center space-x-2">
                      <Compass className="w-4 h-4" />
                      <span className="font-mono font-bold text-xs uppercase">1. Planner</span>
                    </div>
                    <span className="text-[10px] font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">
                      VERIFIED
                    </span>
                  </div>
                  <p className="text-xs text-ink font-mono">
                    Decomposed multi-hop query into 2 connected sub-tasks with attention check.
                  </p>
                </motion.div>

                {/* Step 2: Extractor */}
                <motion.div
                  animate={{
                    borderColor: stepActive === "extractor" ? "#0F766E" : "var(--border-surface)",
                    scale: stepActive === "extractor" ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10 p-4 rounded-xl border bg-app/80 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4" />
                      <span className="font-mono font-bold text-xs uppercase">2. Extractor</span>
                    </div>
                    <span className="text-[10px] font-mono bg-teal-500/20 px-1.5 py-0.5 rounded">
                      XAI SCORED
                    </span>
                  </div>
                  <p className="text-xs text-ink font-mono">
                    NormEnsembleXAI scored 4 ChromaDB chunks. Kept top 2 above 0.85 threshold.
                  </p>
                </motion.div>

                {/* Step 3: QA Agent */}
                <motion.div
                  animate={{
                    borderColor: stepActive === "qa" ? "#15803D" : "var(--border-surface)",
                    scale: stepActive === "qa" ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10 p-4 rounded-xl border bg-app/80 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="font-mono font-bold text-xs uppercase">3. QA Agent</span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded">
                      95% GROUNDED
                    </span>
                  </div>
                  <p className="text-xs text-ink font-mono">
                    Synthesized answer with citation heatmap & passing entity erasure test.
                  </p>
                </motion.div>
              </div>

              {/* Sample Output Preview Box */}
              <div className="p-4 rounded-xl border border-surface bg-surface text-xs font-sans text-ink leading-relaxed">
                <span className="text-muted font-mono text-[11px] block mb-1">
                  Synthesized Answer Preview:
                </span>
                "The director of Inception is <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1 rounded font-medium">Christopher Nolan</span>. His latest film is <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1 rounded font-medium">Oppenheimer (2023)</span>."
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
