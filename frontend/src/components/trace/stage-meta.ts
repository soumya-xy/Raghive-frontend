import { Compass, Filter, ShieldCheck, type LucideIcon } from "lucide-react";

export type StageKey = "planner" | "extractor" | "qa";

export interface StageMeta {
  key: StageKey;
  label: string;
  short: string;
  icon: LucideIcon;
  /** Pastel tile background + matching readable ink. */
  tile: string;
  dot: string;
}

/** Each agent owns one brand pastel: Planner lavender, Extractor mint, QA cream. */
export const STAGES: StageMeta[] = [
  {
    key: "planner",
    label: "Planner",
    short: "Plan",
    icon: Compass,
    tile: "bg-[var(--accent-primary-light)] text-[var(--accent-text)]",
    dot: "bg-[var(--accent-primary)]",
  },
  {
    key: "extractor",
    label: "Extractor",
    short: "Docs",
    icon: Filter,
    tile: "bg-[var(--mint)] text-[var(--accent-secondary-text)]",
    dot: "bg-[var(--accent-secondary)]",
  },
  {
    key: "qa",
    label: "QA",
    short: "QA",
    icon: ShieldCheck,
    tile: "bg-[var(--cream)] text-[var(--cream-text)]",
    dot: "bg-[#f0b45e]",
  },
];
