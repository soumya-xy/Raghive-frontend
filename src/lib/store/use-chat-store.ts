import { create } from "zustand";
import { ReasoningTrace } from "../api/types";

export type AgentStepStatus = "idle" | "planner" | "extractor" | "qa" | "done";

interface ChatState {
  activeChatId: string | null;
  activeMessageId: string | null;
  activeTrace: ReasoningTrace | null;
  streamingStatus: AgentStepStatus;
  streamingSubStatus: string; // e.g. "Planning your query..."
  streamingAnswerText: string;
  isStreaming: boolean;
  hitlPending: boolean;
  hitlMessageId: string | null;
  hitlPlan: ReasoningTrace["planner"] | null;
  hitlReport: unknown;

  setActiveChatId: (id: string | null) => void;
  setActiveMessageId: (id: string | null) => void;
  setActiveTrace: (trace: ReasoningTrace | null) => void;
  setStreamingStatus: (status: AgentStepStatus, subStatus?: string) => void;
  setStreamingAnswerText: (text: string) => void;
  appendStreamingAnswerText: (tok: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setHitl: (payload: {
    pending: boolean;
    messageId?: string | null;
    plan?: ReasoningTrace["planner"] | null;
    report?: unknown;
  }) => void;
  resetStream: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  activeChatId: "chat_inception_101",
  activeMessageId: "msg_asst_1",
  activeTrace: null,
  streamingStatus: "idle",
  streamingSubStatus: "",
  streamingAnswerText: "",
  isStreaming: false,
  hitlPending: false,
  hitlMessageId: null,
  hitlPlan: null,
  hitlReport: null,

  setActiveChatId: (id) => set({ activeChatId: id }),
  setActiveMessageId: (id) => set({ activeMessageId: id }),
  setActiveTrace: (trace) => set({ activeTrace: trace }),
  setStreamingStatus: (status, subStatus = "") =>
    set({ streamingStatus: status, streamingSubStatus: subStatus }),
  setStreamingAnswerText: (text) => set({ streamingAnswerText: text }),
  appendStreamingAnswerText: (tok) =>
    set((state) => ({ streamingAnswerText: state.streamingAnswerText + tok })),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setHitl: ({ pending, messageId, plan, report }) =>
    set((state) => ({
      hitlPending: pending,
      hitlMessageId: messageId !== undefined ? messageId : state.hitlMessageId,
      hitlPlan: plan !== undefined ? plan : state.hitlPlan,
      hitlReport: report !== undefined ? report : state.hitlReport,
    })),
  resetStream: () =>
    set({
      streamingStatus: "idle",
      streamingSubStatus: "",
      streamingAnswerText: "",
      isStreaming: false,
    }),
}));
