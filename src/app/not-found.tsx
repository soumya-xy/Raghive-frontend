import React from "react";
import Link from "next/link";
import { HexMark } from "@/components/shared/hex-mark";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-app text-ink flex flex-col items-center justify-center p-4 text-center">
      <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 mb-6">
        <HexMark size="xl" glow />
      </div>

      <span className="font-mono text-xs font-bold text-amber-500 uppercase tracking-widest">
        404 — PAGE NOT FOUND
      </span>
      <h1 className="font-display text-3xl sm:text-5xl font-bold text-ink mt-2">
        Uncharted Reasoning Route
      </h1>
      <p className="text-muted text-sm max-w-md mt-3 font-mono">
        The vector coordinates or page route you requested does not exist in the RAGHive index.
      </p>

      <div className="mt-8">
        <Button asChild variant="amber" size="lg" className="font-semibold">
          <Link href="/app/chat">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to RAGHive App Workspace
          </Link>
        </Button>
      </div>
    </div>
  );
}
