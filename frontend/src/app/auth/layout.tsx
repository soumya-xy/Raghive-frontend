"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { HexMark } from "@/components/shared/hex-mark";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  const valueProps = [
    {
      title: "Every step, visible.",
      description: "Planner reasoning, the evidence that was retrieved, and the citations behind each sentence.",
    },
    {
      title: "Checked before it answers.",
      description: "Independent verification runs on the plan, the evidence, and the answer.",
    },
    {
      title: "Built for researchers.",
      description: "Inspect, question, and override. Nothing is hidden behind a spinner.",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % valueProps.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [valueProps.length]);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] bg-[var(--bg-app)] text-ink">
      {/* Form */}
      <div className="flex flex-col justify-between px-6 py-8 sm:px-10 relative">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <HexMark size="md" />
            <span className="font-display text-[15px] font-semibold tracking-tight text-ink">RAGHive</span>
          </Link>
          <Link
            href="/"
            className="text-[12px] text-[var(--text-muted)] hover:text-ink transition-colors"
          >
            Back to site
          </Link>
        </div>

        <div className="my-auto w-full max-w-[380px] mx-auto py-10">{children}</div>

        <p className="text-[11px] text-[var(--text-muted)]">
          © {new Date().getFullYear()} RAGHive · LNMIIT research
        </p>
      </div>

      {/* Panel */}
      <div className="hidden lg:flex relative m-3 flex-col justify-between overflow-hidden rounded-[32px] bg-[var(--bg-surface)] p-12">
        <div className="bg-pastel-mesh absolute inset-0 pointer-events-none" />
        <div className="absolute inset-0 bg-dot-grid opacity-50 pointer-events-none [mask-image:radial-gradient(60%_60%_at_50%_50%,black,transparent)]" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center">
          <div className="glass w-full max-w-sm rounded-[28px] border border-white/80 p-8 shadow-lg">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-[var(--mint)] px-3 py-1 text-[11px] font-medium text-[var(--accent-secondary-text)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-secondary)]" />
              Glass-box mode
            </div>

            <div className="min-h-[132px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                >
                  <h3 className="font-display text-[26px] font-semibold tracking-[-0.02em] text-ink">
                    {valueProps[index].title}
                  </h3>
                  <p className="mt-2 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                    {valueProps[index].description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-8 flex gap-1.5" role="tablist" aria-label="Product highlights">
              {valueProps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Highlight ${i + 1}`}
                  aria-selected={i === index}
                  role="tab"
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === index ? "w-6 bg-[var(--accent-primary)]" : "w-1.5 bg-[var(--border-strong)]"
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
