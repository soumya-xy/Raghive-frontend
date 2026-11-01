"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface AttentionHeatmapProps {
  matrix: number[][];
  rowLabels: string[];
  colLabels: string[];
}

/** Lavender ramp: near-white -> brand lavender -> deep lavender at full attention. */
const RAMP: [number, number, number][] = [
  [251, 250, 248],
  [159, 160, 255],
  [58, 59, 168],
];

function cellColor(value: number): string {
  const v = Math.min(1, Math.max(0, value));
  const [from, to, t] = v < 0.5 ? [RAMP[0], RAMP[1], v * 2] : [RAMP[1], RAMP[2], (v - 0.5) * 2];
  const mixed = from.map((c, i) => Math.round(c + (to[i] - c) * t));
  return `rgb(${mixed.join(",")})`;
}

export function AttentionHeatmap({ matrix, rowLabels, colLabels }: AttentionHeatmapProps) {
  if (!matrix || matrix.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="rounded-md border border-[var(--border-surface)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-surface)] px-2.5 py-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Attention matrix
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[var(--text-muted)]">0</span>
            <div className="h-1.5 w-14 rounded-full bg-gradient-to-r from-[#fbfaf8] via-[#9fa0ff] to-[#3a3ba8] border border-[var(--border-surface)]" />
            <span className="text-[9px] text-[var(--text-muted)]">1</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-[var(--bg-surface)] p-1 text-left text-[9px] font-normal text-[var(--text-muted)]" />
                {colLabels.map((col, i) => (
                  <th
                    key={i}
                    className="p-1 text-center text-[9px] font-medium text-[var(--text-muted)] max-w-[64px] truncate"
                    title={col}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, r) => (
                <tr key={r}>
                  <td
                    className="sticky left-0 bg-[var(--bg-surface)] p-1 text-[9px] text-[var(--text-muted)] max-w-[92px] truncate"
                    title={rowLabels[r] || `row ${r + 1}`}
                  >
                    {rowLabels[r] || `${r + 1}`}
                  </td>
                  {row.map((val, c) => (
                    <td key={c} className="p-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="h-5 w-6 rounded-sm border border-white/40"
                            style={{ backgroundColor: cellColor(val) }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="font-mono text-[11px]">
                            {rowLabels[r]} → {colLabels[c]}: {val.toFixed(3)}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
