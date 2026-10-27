"use client";

import React from "react";
import { useUIStore } from "@/lib/store/use-ui-store";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Palette, LayoutGrid } from "lucide-react";

export default function AppearanceSettingsPage() {
  const { density, setDensity } = useUIStore();

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-amber-500" />
            <span>Theme Preference</span>
          </CardTitle>
          <CardDescription>
            Choose between Light mode and Night Hive (dark control room mode)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <LayoutGrid className="w-4 h-4 text-amber-500" />
            <span>UI Spacing Density</span>
          </CardTitle>
          <CardDescription>
            Adjust spacing density across the conversation list and reasoning trace panel
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <button
            onClick={() => setDensity("comfortable")}
            className={`flex-1 p-4 rounded-xl border text-left cursor-pointer transition-all ${
              density === "comfortable"
                ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                : "border-surface bg-surface text-ink hover:border-amber-500/30"
            }`}
          >
            <h4 className="font-display text-sm">Comfortable</h4>
            <p className="text-xs font-mono text-muted mt-1">Generous padding and line height</p>
          </button>

          <button
            onClick={() => setDensity("compact")}
            className={`flex-1 p-4 rounded-xl border text-left cursor-pointer transition-all ${
              density === "compact"
                ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                : "border-surface bg-surface text-ink hover:border-amber-500/30"
            }`}
          >
            <h4 className="font-display text-sm">Compact</h4>
            <p className="text-xs font-mono text-muted mt-1">Dense layout for high information volume</p>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
