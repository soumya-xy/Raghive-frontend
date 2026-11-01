import React from "react";
import { HeroSection } from "./components/hero-section";
import { ProblemSection } from "./components/problem-section";
import { HowItWorksSection } from "./components/how-it-works-section";
import { TraceSection } from "./components/trace-section";
import { FeatureBento } from "./components/feature-bento";
import { ComparisonTable } from "./components/comparison-table";
import { CtaBand } from "./components/cta-band";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <div id="product">
        <ProblemSection />
      </div>
      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <TraceSection />
      <FeatureBento />
      <ComparisonTable />
      <CtaBand />
    </>
  );
}
