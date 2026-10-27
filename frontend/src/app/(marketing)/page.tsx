import React from "react";
import { HeroSection } from "./components/hero-section";
import { ProblemSection } from "./components/problem-section";
import { HowItWorksSection } from "./components/how-it-works-section";
import { FeatureBento } from "./components/feature-bento";
import { ComparisonTable } from "./components/comparison-table";
import { CtaBand } from "./components/cta-band";
import { PageTransition } from "@/components/shared/page-transition";

export default function LandingPage() {
  return (
    <PageTransition>
      <HeroSection />
      <div id="product">
        <ProblemSection />
      </div>
      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <FeatureBento />
      <div id="benchmarks">
        <ComparisonTable />
      </div>
      <CtaBand />
    </PageTransition>
  );
}
