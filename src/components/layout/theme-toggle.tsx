"use client";

import React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useUIStore, Theme } from "@/lib/store/use-ui-store";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useUIStore();

  const items: { mode: Theme; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { mode: "light", icon: Sun, label: "Light" },
    { mode: "dark", icon: Moon, label: "Night Hive" },
    { mode: "system", icon: Laptop, label: "System" },
  ];

  return (
    <div className={cn("flex items-center p-1 rounded-xl bg-surface border border-surface", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = theme === item.mode;
        return (
          <button
            key={item.mode}
            onClick={() => setTheme(item.mode)}
            className={cn(
              "flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer",
              isActive
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-muted hover:text-ink"
            )}
            title={`Switch to ${item.label} mode`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
