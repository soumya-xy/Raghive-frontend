"use client";

import React from "react";
import { Compass, Filter, ShieldCheck, RefreshCw } from "lucide-react";
import { useChatStore } from "@/lib/store/use-chat-store";
import { motion, AnimatePresence } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

export function AgentStatusIndicator() {
  const { streamingStatus, streamingSubStatus } = useChatStore();
  const shouldReduceMotion = useReducedMotion();

  if (streamingStatus === "idle" || streamingStatus === "done") return null;

  const agentDetails = {
    planner: {
      label: "Planner Agent",
      desc: streamingSubStatus || "Decomposing query & running attention verification pass...",
      icon: Compass,
      colorClass: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    },
    extractor: {
      label: "Extractor Agent",
      desc: streamingSubStatus || "Searching ChromaDB vector store & scoring NormEnsembleXAI attribution...",
      icon: Filter,
      colorClass: "text-teal-500 bg-teal-500/10 border-teal-500/30",
    },
    qa: {
      label: "QA / Reasoning Agent",
      desc: streamingSubStatus || "Synthesizing grounded answer & generating citation heatmap...",
      icon: ShieldCheck,
      colorClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    },
  }[streamingStatus] || {
    label: "RAGHive Pipeline",
    desc: "Processing query through multi-agent verification...",
    icon: RefreshCw,
    colorClass: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  };

  const Icon = agentDetails.icon;

  return (
    <div className="w-full max-w-3xl mx-auto mb-3 px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={streamingStatus}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center space-x-3 p-3 rounded-xl border ${agentDetails.colorClass} shadow-xs`}
        >
          <div className="relative">
            <Icon className="w-5 h-5 animate-pulse" />
            <RefreshCw className="w-3 h-3 absolute -bottom-1 -right-1 animate-spin text-amber-500" style={{ animationDuration: '3s' }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider">
                {agentDetails.label}
              </span>
              <span className="font-mono text-[10px] opacity-80 animate-pulse">
                LIVE PIPELINE ACTIVE
              </span>
            </div>
            <p className="text-xs opacity-90 mt-0.5">{agentDetails.desc}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
