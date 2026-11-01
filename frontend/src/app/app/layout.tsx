"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { HexMark } from "@/components/shared/hex-mark";
import { useUIStore } from "@/lib/store/use-ui-store";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  // Conversation pages render their own topbar so the agents panel can span full height.
  const isConversation = /^\/app\/chat\/[^/]+$/.test(pathname ?? "");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/sign-in");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === "b") {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
      } else if (key === "i") {
        e.preventDefault();
        useUIStore.getState().toggleTracePanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-app)] text-ink">
        <div className="animate-pulse">
          <HexMark size="xl" glow />
        </div>
        <p className="mt-4 text-[12px] text-[var(--text-muted)]">Loading workspace…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)] text-ink">
      <AppSidebar />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {!isConversation && <AppTopbar />}
        <main className="relative flex min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
