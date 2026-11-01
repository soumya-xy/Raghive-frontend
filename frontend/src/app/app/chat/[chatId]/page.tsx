"use client";

import React, { use, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMessages } from "@/lib/hooks/use-messages";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";
import { AgentStatusIndicator } from "@/components/chat/agent-status-indicator";
import { HitlPanel } from "@/components/chat/hitl-panel";
import { TracePanel } from "@/components/trace/trace-panel";
import { AppTopbar } from "@/components/layout/app-topbar";
import { useUIStore } from "@/lib/store/use-ui-store";
import { useChatStore } from "@/lib/store/use-chat-store";
import { ApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { PageTransition } from "@/components/shared/page-transition";
import { toast } from "sonner";
import { Message, PlannerTrace, ReasoningTrace, StreamEvent } from "@/lib/api/types";

interface ChatDetailCache {
  chat: unknown;
  messages: Message[];
}

const STAGE_TEXT = {
  planner: "Decomposing the question and checking the plan…",
  extractor: "Retrieving evidence and scoring each chunk…",
  qa: "Writing the answer and grounding it in evidence…",
} as const;

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const resolvedParams = use(params);
  const chatId = resolvedParams.chatId;

  const { idToken } = useAuth();
  const queryClient = useQueryClient();
  const { messages, isLoading, invalidateMessages } = useMessages(chatId);
  const { tracePanelOpen, verificationStrictness, alwaysShowTrace, setTracePanelOpen } = useUIStore();

  // Apply the saved "open the trace panel by default" preference once per session.
  const appliedDefaultRef = React.useRef(false);
  useEffect(() => {
    if (appliedDefaultRef.current) return;
    appliedDefaultRef.current = true;
    if (!alwaysShowTrace && tracePanelOpen) setTracePanelOpen(false);
  }, [alwaysShowTrace, tracePanelOpen, setTracePanelOpen]);

  const activeTrace = useChatStore((s) => s.activeTrace);
  const hitlPending = useChatStore((s) => s.hitlPending);
  const hitlPlan = useChatStore((s) => s.hitlPlan);

  useEffect(() => {
    const store = useChatStore.getState();
    if (store.activeChatId !== chatId) {
      store.setActiveChatId(chatId);
    }
    if (messages.length > 0) {
      const lastAsstMsg = [...messages].reverse().find((m) => m.role === "assistant" && m.trace);
      // Select the latest trace when nothing is selected yet, or when a newer
      // assistant message arrived. Comparing IDs alone breaks when the store
      // default happens to match a stored message id.
      if (lastAsstMsg?.trace && (!store.activeTrace || store.activeMessageId !== lastAsstMsg.id)) {
        store.setActiveTrace(lastAsstMsg.trace);
        store.setActiveMessageId(lastAsstMsg.id);
      }
    }
  }, [chatId, messages]);

  const handlePipelineEvents = (liveTrace: ReasoningTrace, event: StreamEvent) => {
    const currentStore = useChatStore.getState();

    switch (event.type) {
      case "agent_status": {
        const agent = (event.agent === "extractor" || event.agent === "qa" ? event.agent : "planner") as
          | "planner"
          | "extractor"
          | "qa";
        if (event.status === "started") {
          currentStore.setStreamingStatus(agent, STAGE_TEXT[agent]);
        } else if (event.status === "retrying") {
          currentStore.setStreamingStatus("planner", event.reason || "Retrying the plan with feedback…");
        } else if (event.status === "awaiting_human_input") {
          currentStore.setStreamingStatus("planner", "Waiting for your review of the plan…");
        }
        break;
      }
      case "planner_result":
        liveTrace.planner = event.data as ReasoningTrace["planner"];
        currentStore.setActiveTrace({ ...liveTrace });
        break;
      case "extractor_result":
        liveTrace.extractor = event.data as ReasoningTrace["extractor"];
        currentStore.setActiveTrace({ ...liveTrace });
        break;
      case "qa_result":
        liveTrace.qa = event.data as ReasoningTrace["qa"];
        currentStore.setActiveTrace({ ...liveTrace });
        break;
      case "token":
        currentStore.appendStreamingAnswerText(String(event.data ?? ""));
        break;
      case "awaiting_human_input": {
        const payload = (event.data ?? {}) as {
          plan?: PlannerTrace;
          verificationReport?: unknown;
        };
        currentStore.setHitl({
          pending: true,
          plan: payload.plan || liveTrace.planner,
          report: payload.verificationReport,
        });
        break;
      }
      case "done": {
        if (event.pending) {
          currentStore.setHitl({ pending: true, messageId: event.messageId || null });
          currentStore.setIsStreaming(false);
          invalidateMessages();
          toast.message("Paused for review — the plan needs your approval.");
          return;
        }
        currentStore.setHitl({ pending: false, messageId: null, plan: null, report: null });
        currentStore.resetStream();
        invalidateMessages();
        if (event.messageId) currentStore.setActiveMessageId(event.messageId);
        toast.success("Answer ready");
        break;
      }
      case "error":
        toast.error(event.message || "The pipeline returned an error.");
        currentStore.resetStream();
        break;
      default:
        break;
    }
  };

  const handleSend = async (content: string) => {
    const store = useChatStore.getState();
    store.setIsStreaming(true);
    store.setStreamingAnswerText("");
    store.setHitl({ pending: false, plan: null, report: null, messageId: null });
    store.setStreamingStatus("planner", STAGE_TEXT.planner);

    // Optimistically show the user message; invalidateMessages() reconciles with the server.
    queryClient.setQueryData<ChatDetailCache>(["messages", chatId, idToken], (old) => {
      if (!old) return old;
      return {
        ...old,
        messages: [
          ...(old.messages || []),
          {
            id: `tmp_user_${Date.now()}`,
            role: "user",
            content,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });

    try {
      const liveTrace: ReasoningTrace = { planner: null, extractor: null, qa: null };
      await ApiClient.sendQueryStream(
        chatId,
        content,
        (event) => handlePipelineEvents(liveTrace, event),
        idToken || undefined,
        { verificationStrictness }
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the query.");
      useChatStore.getState().resetStream();
    }
  };

  const resume = async (body: {
    approvedPlan?: unknown;
    editedSubQuestions?: unknown[];
    regenerate?: boolean;
  }) => {
    const messageId = useChatStore.getState().hitlMessageId;
    if (!messageId) {
      toast.error("No paused message to resume.");
      return;
    }

    const store = useChatStore.getState();
    store.setIsStreaming(true);
    store.setHitl({ pending: false });

    try {
      const liveTrace: ReasoningTrace = { planner: store.hitlPlan, extractor: null, qa: null };
      await ApiClient.resumeQueryStream(
        chatId,
        messageId,
        body,
        (event) => handlePipelineEvents(liveTrace, event),
        idToken || undefined
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resume the pipeline.");
      useChatStore.getState().resetStream();
    }
  };

  return (
    <PageTransition className="flex h-full min-w-0 flex-1 overflow-hidden">
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopbar chatId={chatId} />
        <MessageList messages={messages} onSelectPrompt={handleSend} />
        <AgentStatusIndicator />
        {hitlPending && (
          <HitlPanel
            plan={hitlPlan}
            onApprove={() => resume({ approvedPlan: hitlPlan || undefined })}
            onRegenerate={() => resume({ regenerate: true })}
            onEdit={(questions) => resume({ editedSubQuestions: questions })}
          />
        )}
        <Composer onSend={handleSend} disabled={isLoading || hitlPending} />
      </div>

      <TracePanel trace={activeTrace} isLoading={isLoading} />
    </PageTransition>
  );
}
