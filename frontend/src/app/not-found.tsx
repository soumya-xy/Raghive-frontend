import React from "react";
import Link from "next/link";
import { HexMark } from "@/components/shared/hex-mark";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-app)] p-6 text-center text-ink">
      <HexMark size="lg" />
      <p className="mt-5 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">404</p>
      <h1 className="mt-1 font-display text-[24px] font-semibold text-ink">Page not found</h1>
      <p className="mt-1.5 max-w-sm text-[13px] text-[var(--text-muted)]">
        That route does not exist. It may have been moved or deleted.
      </p>

      <div className="mt-6">
        <Button asChild variant="primary">
          <Link href="/app/chat">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to workspace
          </Link>
        </Button>
      </div>
    </div>
  );
}
