"use client";

import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface AttentionHeatmapProps {
  matrix: number[][];
  rowLabels: string[];
  colLabels: string[];
}

export function AttentionHeatmap({ matrix, rowLabels, colLabels }: AttentionHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number; val: number } | null>(
    null
  );

  if (!matrix || matrix.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="space-y-3 p-3 rounded-xl border border-surface bg-surface/50 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Verification Pass Attention Saliency Matrix
          </span>
          <div className="flex items-center space-x-1 font-mono text-[10px] text-muted">
            <span>0.0</span>
            <div className="h-2 w-16 rounded bg-gradient-to-r from-amber-500/10 via-amber-500/50 to-amber-500" />
            <span>1.0</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-1 text-left font-mono text-[10px] text-muted font-normal min-w-[100px]">
                  Step \ Keyword
                </th>
                {colLabels.map((col, idx) => (
                  <th
                    key={idx}
                    className="p-1 text-center font-mono text-[10px] text-ink font-semibold truncate max-w-[80px]"
                    title={col}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, rIdx) => (
                <tr key={rIdx}>
                  <td
                    className="p-1 text-left font-mono text-[10px] text-muted truncate max-w-[120px]"
                    title={rowLabels[rIdx] || `Step ${rIdx + 1}`}
                  >
                    {rowLabels[rIdx] || `Step ${rIdx + 1}`}
                  </td>
                  {row.map((val, cIdx) => (
                    <td key={cIdx} className="p-1 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            onMouseEnter={() => setHoveredCell({ r: rIdx, c: cIdx, val })}
                            onMouseLeave={() => setHoveredCell(null)}
                            style={{
                              backgroundColor: `rgba(217, 119, 6, ${Math.max(0.1, val)})`,
                            }}
                            className="h-7 w-full min-w-[28px] rounded flex items-center justify-center font-mono text-[10px] font-semibold text-zinc-950 transition-all hover:scale-105 cursor-pointer shadow-sm"
                          >
                            {val.toFixed(2)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-mono">
                            {rowLabels[rIdx]} → <strong>{colLabels[cIdx]}</strong>: {val.toFixed(3)}
                          </p>
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
