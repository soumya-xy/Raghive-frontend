import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HexMark } from "@/components/shared/hex-mark";
import { ArrowRight } from "lucide-react";

export function CtaBand() {
  return (
    <section className="py-20 bg-gradient-to-r from-amber-500/15 via-app to-teal-500/15 border-t border-surface">
      <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
        <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <HexMark size="lg" glow />
        </div>
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-ink">
          From Black Box to Glass Box.
        </h2>
        <p className="text-muted text-base max-w-xl mx-auto">
          Experience explainable RAG with real-time saliency matrices, evidence attribution, and zero-trust verification.
        </p>
        <div className="pt-2">
          <Button asChild variant="amber" size="lg" className="font-semibold shadow-xl">
            <Link href="/auth/sign-up">
              <span>Start Exploring RAGHive Now</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
