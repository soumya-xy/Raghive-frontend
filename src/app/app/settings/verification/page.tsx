"use client";

import React from "react";
import { useUIStore } from "@/lib/store/use-ui-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldCheck, Eye, Layers, Sliders } from "lucide-react";
import { toast } from "sonner";
import { ApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";

export default function VerificationSettingsPage() {
  const {
    alwaysShowTrace,
    setAlwaysShowTrace,
    verificationStrictness,
    setVerificationStrictness,
    showHeatmapsByDefault,
    setShowHeatmapsByDefault,
  } = useUIStore();

  const { idToken } = useAuth();

  const handleStrictnessChange = (val: "standard" | "thorough") => {
    setVerificationStrictness(val);
    ApiClient.patchPreferences({ verificationStrictness: val }, idToken || undefined).catch(() => {});
    toast.success(`Verification strictness set to ${val.toUpperCase()}`);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>Zero-Trust Verification Strictness</span>
          </CardTitle>
          <CardDescription>
            Controls the threshold for Planner attention passes and NormEnsembleXAI attribution filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleStrictnessChange("standard")}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                verificationStrictness === "standard"
                  ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                  : "border-surface bg-surface text-ink hover:border-amber-500/30"
              }`}
            >
              <h4 className="font-display text-sm">Standard (0.75 Threshold)</h4>
              <p className="text-xs font-mono text-muted mt-1">
                Balanced latency and attribution verification
              </p>
            </button>

            <button
              onClick={() => handleStrictnessChange("thorough")}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                verificationStrictness === "thorough"
                  ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                  : "border-surface bg-surface text-ink hover:border-amber-500/30"
              }`}
            >
              <h4 className="font-display text-sm">Thorough (0.85 Threshold)</h4>
              <p className="text-xs font-mono text-muted mt-1">
                Zero-trust mandate with mandatory counterfactual erasure testing
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Panel & Visualizer Defaults</span>
          </CardTitle>
          <CardDescription>
            Customize automatic UI expansion for reasoning traces and attention matrix heatmaps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-xl border border-surface bg-surface cursor-pointer">
            <div>
              <span className="font-display font-semibold text-xs text-ink block">
                Always show Reasoning Trace panel by default
              </span>
              <span className="text-[11px] text-muted font-mono">
                Automatically opens the right-hand panel on new assistant responses
              </span>
            </div>
            <input
              type="checkbox"
              checked={alwaysShowTrace}
              onChange={(e) => setAlwaysShowTrace(e.target.checked)}
              className="rounded accent-amber-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-surface bg-surface cursor-pointer">
            <div>
              <span className="font-display font-semibold text-xs text-ink block">
                Show Attention Heatmaps by default
              </span>
              <span className="text-[11px] text-muted font-mono">
                Expands token-by-token saliency matrices in Planner sections
              </span>
            </div>
            <input
              type="checkbox"
              checked={showHeatmapsByDefault}
              onChange={(e) => setShowHeatmapsByDefault(e.target.checked)}
              className="rounded accent-amber-500 w-4 h-4"
            />
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
