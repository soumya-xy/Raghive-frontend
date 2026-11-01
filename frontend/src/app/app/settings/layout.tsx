"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { User, Palette, ShieldCheck, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/app/settings/profile", label: "Profile", icon: User },
    { href: "/app/settings/appearance", label: "Appearance", icon: Palette },
    { href: "/app/settings/verification", label: "Verification", icon: ShieldCheck },
    { href: "/app/settings/account", label: "Account", icon: Lock },
  ];

  return (
    <PageTransition className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">Settings</h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Preferences and account details.
        </p>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border-surface)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors",
                isActive
                  ? "border-[var(--accent-ring)] text-ink font-medium"
                  : "border-transparent text-[var(--text-muted)] hover:text-ink"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      <div>{children}</div>
    </PageTransition>
  );
}
