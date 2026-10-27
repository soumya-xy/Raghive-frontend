"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Loader2 } from "lucide-react";
import { HexMark } from "@/components/shared/hex-mark";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/sign-in");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-app text-ink">
        <HexMark size="xl" glow className="animate-bounce" />
        <div className="flex items-center space-x-2 mt-4 text-xs font-mono text-muted">
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          <span>Authenticating RAGHive Session...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex overflow-hidden bg-app text-ink">
      {/* Collapsible Left Sidebar */}
      <AppSidebar />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <AppTopbar />
        <main className="flex-1 flex min-h-0 overflow-hidden relative">{children}</main>
      </div>
    </div>
  );
}
