import React from "react";
import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/10",
        className
      )}
    />
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4 max-w-3xl mx-auto w-full">
      <div className="flex items-start space-x-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function TracePanelSkeleton() {
  return (
    <div className="space-y-6 p-4 w-full">
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
