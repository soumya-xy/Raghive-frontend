"use client";

import React, { useState } from "react";
import { PlannerTrace } from "@/lib/api/types";
import { Button } from "../ui/button";
import { AlertTriangle, Check, RefreshCw, Pencil } from "lucide-react";

interface HitlPanelProps {
  plan: PlannerTrace | null;
  report?: unknown;
  busy?: boolean;
  onApprove: () => void;
  onRegenerate: () => void;
  onEdit: (questions: string[]) => void;
}

export function HitlPanel({ plan, busy, onApprove, onRegenerate, onEdit }: HitlPanelProps) {
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<string[]>(plan?.steps.map((s) => s.text) || []);

  if (!plan) return null;

  return (
    <div className="w-full max-w-[760px] mx-auto mb-2 px-6">
      <div className="rounded-2xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]">
        <div className="flex items-start gap-2.5 px-3.5 py-3">
          <AlertTriangle className="w-4 h-4 text-[var(--status-warning)] mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--status-warning)]">Review required</p>
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              Planner verification failed after one retry. Approve, edit a step, or regenerate — the
              pipeline will not continue on its own.
            </p>
          </div>
        </div>

        <ol className="px-3.5 pb-1 space-y-1.5">
          {(editing ? drafts : plan.steps.map((s) => s.text)).map((text, idx) => (
            <li key={plan.steps[idx]?.id || idx} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded bg-[var(--bg-surface)] border border-[var(--status-warning-border)] text-[10px] font-medium text-[var(--status-warning)] shrink-0 tabular">
                {idx + 1}
              </span>
              {editing ? (
                <textarea
                  value={drafts[idx]}
                  onChange={(e) => {
                    const next = [...drafts];
                    next[idx] = e.target.value;
                    setDrafts(next);
                  }}
                  rows={2}
                  className="flex-1 text-[12px] rounded-md border border-[var(--border-surface)] bg-[var(--bg-surface)] p-1.5 text-ink focus:outline-none focus:border-[var(--accent-ring)]"
                />
              ) : (
                <span className="text-[12px] text-[var(--text-secondary)] leading-snug">{text}</span>
              )}
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-1.5 px-3.5 pb-3 pt-2">
          <Button size="sm" variant="primary" disabled={busy} onClick={onApprove}>
            <Check className="w-3.5 h-3.5" />
            Approve
          </Button>
          {editing ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onEdit(drafts)}>
              <Pencil className="w-3.5 h-3.5" />
              Submit edits
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5" />
              Edit steps
            </Button>
          )}
          <Button size="sm" variant="ghost" disabled={busy} onClick={onRegenerate}>
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}
