"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { User, Palette, ShieldCheck, Lock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/app/settings/profile", label: "Profile", icon: User },
    { href: "/app/settings/appearance", label: "Appearance", icon: Palette },
    { href: "/app/settings/verification", label: "Verification Preferences", icon: ShieldCheck },
    { href: "/app/settings/account", label: "Account & Security", icon: Lock },
  ];

  return (
    <PageTransition className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Settings & Preferences</h1>
        <p className="text-xs text-muted font-mono mt-1">
          Customize your RAGHive glass-box explainability controls and account details
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-1 border-b border-surface pb-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all shrink-0",
                isActive
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  : "text-muted hover:text-ink hover:bg-surface"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="py-2">{children}</div>
    </PageTransition>
  );
}
