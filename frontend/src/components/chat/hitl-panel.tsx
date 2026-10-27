"use client";

import React, { useState } from "react";
import { PlannerTrace } from "@/lib/api/types";
import { Button } from "../ui/button";
import { ShieldAlert, Check, RefreshCw, Pencil } from "lucide-react";

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
    <div className="w-full max-w-3xl mx-auto mb-3 px-4">
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
        <div className="flex items-start space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Human review required
            </p>
            <p className="text-xs text-ink mt-1">
              Planner verification failed after one retry. Approve the plan, edit a sub-question, or regenerate.
              The pipeline will not continue on its own.
            </p>
          </div>
        </div>

        <ol className="space-y-2 pl-1">
          {(editing ? drafts : plan.steps.map((s) => s.text)).map((text, idx) => (
            <li key={plan.steps[idx]?.id || idx} className="flex items-start space-x-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
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
                  className="flex-1 text-xs rounded-lg border border-surface bg-surface p-2 text-ink"
                  rows={2}
                />
              ) : (
                <span className="text-xs text-ink">{text}</span>
              )}
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="amber" disabled={busy} onClick={onApprove} className="font-semibold">
            <Check className="w-3.5 h-3.5 mr-1" />
            Approve plan
          </Button>
          {editing ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onEdit(drafts)}
              className="font-semibold"
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Submit edits
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Edit sub-questions
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={busy} onClick={onRegenerate}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}
