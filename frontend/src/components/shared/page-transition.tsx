"use client";

import React from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
