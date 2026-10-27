import { create } from "zustand";

interface TraceState {
  hoveredCitationIds: string[];
  hoveredSentenceSpan: [number, number] | null;
  showFilteredChunks: boolean;

  setHoveredCitationIds: (ids: string[]) => void;
  setHoveredSentenceSpan: (span: [number, number] | null) => void;
  toggleFilteredChunks: () => void;
  setShowFilteredChunks: (val: boolean) => void;
}

export const useTraceStore = create<TraceState>()((set) => ({
  hoveredCitationIds: [],
  hoveredSentenceSpan: null,
  showFilteredChunks: false,

  setHoveredCitationIds: (ids) => set({ hoveredCitationIds: ids }),
  setHoveredSentenceSpan: (span) => set({ hoveredSentenceSpan: span }),
  toggleFilteredChunks: () => set((s) => ({ showFilteredChunks: !s.showFilteredChunks })),
  setShowFilteredChunks: (val) => set({ showFilteredChunks: val }),
}));
