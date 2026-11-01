import { create } from "zustand";
import { persist } from "zustand/middleware";

export type StrictnessLevel = "standard" | "thorough";

interface UIState {
  sidebarOpen: boolean;
  tracePanelOpen: boolean;
  activeTraceTab: "planner" | "extractor" | "qa" | "all";
  density: "comfortable" | "compact";
  alwaysShowTrace: boolean;
  verificationStrictness: StrictnessLevel;
  showHeatmapsByDefault: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTracePanel: () => void;
  setTracePanelOpen: (open: boolean) => void;
  setActiveTraceTab: (tab: "planner" | "extractor" | "qa" | "all") => void;
  setDensity: (density: "comfortable" | "compact") => void;
  setAlwaysShowTrace: (val: boolean) => void;
  setVerificationStrictness: (val: StrictnessLevel) => void;
  setShowHeatmapsByDefault: (val: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      tracePanelOpen: true,
      activeTraceTab: "all",
      density: "comfortable",
      alwaysShowTrace: true,
      verificationStrictness: "standard",
      showHeatmapsByDefault: true,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleTracePanel: () => set((state) => ({ tracePanelOpen: !state.tracePanelOpen })),
      setTracePanelOpen: (open) => set({ tracePanelOpen: open }),
      setActiveTraceTab: (tab) => set({ activeTraceTab: tab }),
      setDensity: (density) => set({ density }),
      setAlwaysShowTrace: (alwaysShowTrace) => set({ alwaysShowTrace }),
      setVerificationStrictness: (verificationStrictness) => set({ verificationStrictness }),
      setShowHeatmapsByDefault: (showHeatmapsByDefault) => set({ showHeatmapsByDefault }),
    }),
    {
      name: "raghive-ui-preferences",
      version: 2,
      // Drop the removed theme field from previously persisted state.
      migrate: (persisted: unknown) => {
        const next = { ...(persisted as Record<string, unknown>) };
        delete next.theme;
        return next as Partial<UIState>;
      },
    }
  )
);
