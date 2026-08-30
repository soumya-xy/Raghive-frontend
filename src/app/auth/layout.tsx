"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { HexMark } from "@/components/shared/hex-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  const valueProps = [
    {
      title: "Every step, scored.",
      desc: "Planner attention, vector evidence attribution, and QA faithfulness in real time.",
    },
    {
      title: "Nothing reaches you unverified.",
      desc: "Zero-trust explainability architecture powered by NormEnsembleXAI.",
    },
    {
      title: "Counterfactual rigor.",
      desc: "Entity erasure testing confirms grounding before answers reach your screen.",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % valueProps.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [valueProps.length]);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-app text-ink">
      {/* Left Column: Custom Form Area */}
      <div className="flex flex-col justify-between p-6 sm:p-10 z-10 relative">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <HexMark size="md" glow />
            <span className="font-display font-bold text-xl tracking-tight text-ink group-hover:text-amber-500 transition-colors">
              RAGHive
            </span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="my-auto py-8 max-w-md w-full mx-auto">{children}</div>

        <div className="text-xs text-muted text-center sm:text-left font-mono">
          © {new Date().getFullYear()} RAGHive Project • LNMIIT Research
        </div>
      </div>

      {/* Right Column: Decorative Animated Hex Grid Background */}
      <div className="hidden lg:flex relative bg-hex-grid border-l border-surface flex-col justify-between p-12 overflow-hidden bg-surface/50">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-teal-500/10 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="max-w-md text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <HexMark size="xl" glow />
            </div>

            <div className="min-h-[120px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-2"
                >
                  <h3 className="font-display text-2xl font-bold text-ink">
                    "{valueProps[index].title}"
                  </h3>
                  <p className="text-sm text-muted font-mono leading-relaxed">
                    {valueProps[index].desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Slide dots */}
            <div className="flex justify-center space-x-2">
              {valueProps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-6 bg-amber-500" : "w-1.5 bg-surface border border-surface"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
