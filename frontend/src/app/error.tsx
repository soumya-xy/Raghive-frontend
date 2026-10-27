"use client";

import React, { useEffect } from "react";
import { HexMark } from "@/components/shared/hex-mark";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global boundary caught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-app text-ink flex flex-col items-center justify-center p-4 text-center">
      <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/30 mb-6 text-rose-500">
        <AlertTriangle className="w-12 h-12" />
      </div>

      <span className="font-mono text-xs font-bold text-rose-500 uppercase tracking-widest">
        PIPELINE EXCEPTION ENCOUNTERED
      </span>
      <h1 className="font-display text-3xl font-bold text-ink mt-2">
        An unexpected error occurred
      </h1>
      <p className="text-muted text-xs max-w-md mt-2 font-mono bg-surface p-3 rounded-lg border border-surface">
        {error.message || "Unknown error"}
      </p>

      <div className="mt-6 flex space-x-3">
        <Button variant="amber" onClick={() => reset()} className="font-semibold">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Pipeline Execution
        </Button>
      </div>
    </div>
  );
}
