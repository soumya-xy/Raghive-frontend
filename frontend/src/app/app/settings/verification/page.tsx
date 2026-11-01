"use client";

import React from "react";
import { useUIStore } from "@/lib/store/use-ui-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldCheck, Layers } from "lucide-react";
import { toast } from "sonner";
import { ApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils/cn";

function StrictnessOption({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-[var(--accent-ring)] bg-[var(--accent-primary-light)]"
          : "border-[var(--border-surface)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]"
      )}
    >
      <p className="text-[13px] font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">{description}</p>
    </button>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-[var(--border-surface)] px-3 py-2.5">
      <div>
        <p className="text-[13px] text-ink">{label}</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-[var(--accent-primary)]" : "bg-[var(--border-strong)]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </button>
    </label>
  );
}

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
    toast.success(`Strictness set to ${val}`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            Verification strictness
          </CardTitle>
          <CardDescription>
            Raises the similarity, attribution, and grounding thresholds used during a query.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <StrictnessOption
            label="Standard"
            description="Similarity 0.52, attribution 0.48, grounding 0.70, top-k 12."
            active={verificationStrictness === "standard"}
            onClick={() => handleStrictnessChange("standard")}
          />
          <StrictnessOption
            label="Thorough"
            description="Similarity 0.68, attribution 0.62, grounding 0.85, top-k 20, answer regenerated for the erasure test."
            active={verificationStrictness === "thorough"}
            onClick={() => handleStrictnessChange("thorough")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            Trace panel defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Toggle
            label="Open the trace panel by default"
            description="Shows the right-hand panel when you open a conversation."
            checked={alwaysShowTrace}
            onChange={setAlwaysShowTrace}
          />
          <Toggle
            label="Expand attention matrix"
            description="Opens the planner's attention heatmap without an extra click."
            checked={showHeatmapsByDefault}
            onChange={setShowHeatmapsByDefault}
          />
        </CardContent>
      </Card>
    </div>
  );
}
