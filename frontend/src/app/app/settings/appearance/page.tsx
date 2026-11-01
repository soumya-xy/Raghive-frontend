"use client";

import React from "react";
import { useUIStore } from "@/lib/store/use-ui-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function DensityOption({
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
        "flex-1 rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-[var(--accent-ring)] bg-[var(--accent-primary-light)]"
          : "border-[var(--border-surface)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]"
      )}
    >
      <p className="text-[13px] font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{description}</p>
    </button>
  );
}

export default function AppearanceSettingsPage() {
  const { density, setDensity } = useUIStore();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            Spacing density
          </CardTitle>
          <CardDescription>
            Controls spacing in the conversation list and the reasoning trace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <DensityOption
            label="Comfortable"
            description="More padding and line height"
            active={density === "comfortable"}
            onClick={() => setDensity("comfortable")}
          />
          <DensityOption
            label="Compact"
            description="More information per screen"
            active={density === "compact"}
            onClick={() => setDensity("compact")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Light interface</CardTitle>
          <CardDescription>
            RAGHive uses a single light theme tuned for long reading sessions. There is no dark mode.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
