"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { HexMark } from "@/components/shared/hex-mark";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Compass,
  Filter,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import TubesCursor from "@/components/ui/tubes-curor";

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();
  const [stepActive, setStepActive] = useState<"planner" | "extractor" | "qa">("planner");
  const [score, setScore] = useState(82);

  // Animate demo score ticking up and cycle active pipeline step
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
    <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden">
      {/* Background Tubes Cursor Interactive WebGL Animation */}
      <div className="absolute inset-0 z-0 pointer-events-auto overflow-hidden">
        <TubesCursor className="w-full h-full ">
          {/* Subtle translucent backdrop overlay ensuring ultra-crisp text legibility in light & dark modes */}
          <div className="absolute inset-0 bg-gradient-to-b from-bg-app/40 via-bg-app/80 to-bg-app pointer-events-none" />
        </TubesCursor>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Pitch Tagline Badge */}
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-mono font-medium shadow-xs backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span> Glass-Box Explainable RAG</span>
          </motion.div>
        </div>

        {/* Hero Headline & Subheadline */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-ink leading-[1.1]"
          >
            Every other AI answers you and hopes you trust it.{" "}
            <span className="relative inline-block text-amber-600 font-extrabold">
              RAGHive shows its work.
              <svg
                className="absolute -bottom-2 left-0 w-full h-3 text-amber-500/40"
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,15 Q25,5 50,15 T100,15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
              </svg>
            </span>
          </motion.h1>

          {/* <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted text-base sm:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Every step, scored and traceable, before the answer ever reaches you. Multi-agent
            planning, vector evidence attribution scoring, and sentence-level citation heatmaps.
          </motion.p> */}

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Button
              asChild
              variant="amber"
              size="lg"
              className="w-full sm:w-auto font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all"
            >
              <Link href="/auth/sign-up">
                <span>Start Free Glass-Box Trial</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto font-mono backdrop-blur-md bg-surface/80 hover:bg-surface"
            >
              <Link href="/app/chat">
                <span>See Live Trace Demo →</span>
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Hero Central Visualizer Component */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-14 max-w-4xl mx-auto"
        >
          <div className="relative p-1 rounded-3xl bg-gradient-to-b from-amber-500/40 via-teal-500/30 to-emerald-500/40 shadow-2xl backdrop-blur-xl">
            <div className="bg-surface/90 dark:bg-surface/95 rounded-[22px] p-6 md:p-8 space-y-6 border border-surface/50">
              
              {/* Pipeline Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface pb-4">
                <div className="flex items-center space-x-3">
                  <HexMark size="sm" glow />
                  <span className="font-display font-semibold text-sm text-ink tracking-tight">
                    RAGHive Glass-Box Agent Pipeline
                  </span>
                </div>

                {/* Score & Live Trace Badge */}
                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-2" />
                    LIVE TRACE ACTIVE ({score}%)
                  </span>
                </div>
              </div>

              {/* Step Interactive Selector Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-app/80 border border-surface text-xs font-mono">
                {(["planner", "extractor", "qa"] as const).map((stepKey) => {
                  const labels = {
                    planner: "1. Planner",
                    extractor: "2. Extractor",
                    qa: "3. QA Agent",
                  };
                  const colors = {
                    planner: "text-amber-600 dark:text-amber-400",
                    extractor: "text-teal-600 dark:text-teal-400",
                    qa: "text-emerald-600 dark:text-emerald-400",
                  };
                  const isActive = stepActive === stepKey;
                  return (
                    <button
                      key={stepKey}
                      onClick={() => setStepActive(stepKey)}
                      className={`py-2 px-3 rounded-lg font-bold transition-all text-center flex items-center justify-center space-x-1.5 cursor-pointer ${
                        isActive
                          ? "bg-surface text-ink shadow-sm border border-surface"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      <span className={isActive ? colors[stepKey] : ""}>
                        {labels[stepKey]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 3-Step Pipeline Flow Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                {/* Visual Connector Line */}
                <div className="hidden md:block absolute top-1/2 left-4 right-4 h-0.5 bg-gradient-to-r from-amber-500 via-teal-500 to-emerald-500 -translate-y-1/2 opacity-25 z-0" />

                {/* Step 1: Planner */}
                <motion.div
                  onClick={() => setStepActive("planner")}
                  animate={{
                    borderColor: stepActive === "planner" ? "#D97706" : "var(--border-surface)",
                    scale: stepActive === "planner" ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className={`relative z-10 p-4 rounded-xl border bg-app/90 backdrop-blur-md shadow-sm space-y-2.5 cursor-pointer transition-all ${
                    stepActive === "planner" ? "ring-2 ring-amber-500/20" : "hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                    <div className="flex items-center space-x-2">
                      <Compass className="w-4 h-4" />
                      <span className="font-mono font-bold text-xs uppercase">1. Planner</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                      VERIFIED
                    </span>
                  </div>
                  <p className="text-xs text-ink font-mono leading-relaxed">
                    Decomposed multi-hop query into 2 connected sub-tasks with attention check.
                  </p>
                </motion.div>

                {/* Step 2: Extractor */}
                <motion.div
                  onClick={() => setStepActive("extractor")}
                  animate={{
                    borderColor: stepActive === "extractor" ? "#0F766E" : "var(--border-surface)",
                    scale: stepActive === "extractor" ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className={`relative z-10 p-4 rounded-xl border bg-app/90 backdrop-blur-md shadow-sm space-y-2.5 cursor-pointer transition-all ${
                    stepActive === "extractor" ? "ring-2 ring-teal-500/20" : "hover:border-teal-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4" />
                      <span className="font-mono font-bold text-xs uppercase">2. Extractor</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold bg-teal-500/20 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                      XAI SCORED
                    </span>
                  </div>
                  <p className="text-xs text-ink font-mono leading-relaxed">
                    NormEnsembleXAI scored 4 ChromaDB chunks. Kept top 2 above 0.85 threshold.
                  </p>
                </motion.div>

                {/* Step 3: QA Agent */}
                <motion.div
                  onClick={() => setStepActive("qa")}
                  animate={{
                    borderColor: stepActive === "qa" ? "#15803D" : "var(--border-surface)",
                    scale: stepActive === "qa" ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className={`relative z-10 p-4 rounded-xl border bg-app/90 backdrop-blur-md shadow-sm space-y-2.5 cursor-pointer transition-all ${
                    stepActive === "qa" ? "ring-2 ring-emerald-500/20" : "hover:border-emerald-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="font-mono font-bold text-xs uppercase">3. QA Agent</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      95% GROUNDED
                    </span>
                  </div>
                  <p className="text-xs text-ink font-mono leading-relaxed">
                    Synthesized answer with citation heatmap & passing entity erasure test.
                  </p>
                </motion.div>
              </div>

              {/* Sample Output Preview Box */}
              <div className="p-4 rounded-xl border border-surface bg-app/60 backdrop-blur-md text-xs font-sans text-ink leading-relaxed space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted font-mono text-[11px] font-medium tracking-wide">
                    Synthesized Answer Preview:
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Grounded & Verified
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-surface/80 text-ink font-medium">
                  "The director of Inception is{" "}
                  <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-semibold">
                    Christopher Nolan
                  </span>
                  . His latest film is{" "}
                  <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-semibold">
                    Oppenheimer (2023)
                  </span>
                  ."
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
