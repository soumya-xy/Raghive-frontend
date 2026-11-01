import React from "react";
import { cn } from "@/lib/utils/cn";

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[var(--bg-subtle)]", className)} />;
}

export function TracePanelSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Bar className="h-4 w-24" />
        <Bar className="h-4 w-12" />
      </div>
      <Bar className="h-20 w-full" />
      <div className="space-y-2">
        <Bar className="h-3 w-32" />
        <Bar className="h-10 w-full" />
        <Bar className="h-10 w-full" />
      </div>
      <Bar className="h-28 w-full" />
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex items-start gap-3 max-w-3xl">
      <Bar className="h-6 w-6 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Bar className="h-3 w-24" />
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Bar key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
