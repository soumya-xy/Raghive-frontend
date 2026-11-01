"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Global boundary caught error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-app)] p-6 text-center text-ink">
      <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]">
        <AlertTriangle className="h-5 w-5 text-[var(--status-danger)]" />
      </div>

      <h1 className="font-display text-[22px] font-semibold text-ink">Something went wrong</h1>
      <p className="mt-1.5 max-w-md text-[13px] text-[var(--text-muted)]">
        The page hit an unexpected error. You can retry, or go back to the workspace.
      </p>

      <pre className="mt-4 max-w-md overflow-x-auto rounded-md border border-[var(--border-surface)] bg-[var(--bg-surface)] p-3 text-left text-[11px] text-[var(--text-secondary)]">
        {error.message || "Unknown error"}
      </pre>

      <div className="mt-6 flex gap-2">
        <Button variant="primary" onClick={() => reset()}>
          <RotateCw className="h-3.5 w-3.5" />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/app/chat">Back to workspace</Link>
        </Button>
      </div>
    </div>
  );
}
