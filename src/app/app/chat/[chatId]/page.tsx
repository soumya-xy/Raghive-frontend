"use client";

import React, { useEffect, use } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMessages } from "@/lib/hooks/use-messages";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";
import { AgentStatusIndicator } from "@/components/chat/agent-status-indicator";
import { HitlPanel } from "@/components/chat/hitl-panel";
import { TracePanel } from "@/components/trace/trace-panel";
import { useUIStore } from "@/lib/store/use-ui-store";
import { useChatStore } from "@/lib/store/use-chat-store";
import { ApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { PageTransition } from "@/components/shared/page-transition";
import { toast } from "sonner";
import { PlannerTrace, StreamEvent } from "@/lib/api/types";

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const resolvedParams = use(params);
  const chatId = resolvedParams.chatId;

  const { idToken } = useAuth();
  const queryClient = useQueryClient();
  const { messages, isLoading, invalidateMessages } = useMessages(chatId);
  const { tracePanelOpen, verificationStrictness } = useUIStore();

  const activeTrace = useChatStore((s) => s.activeTrace);
  const hitlPending = useChatStore((s) => s.hitlPending);
  const hitlPlan = useChatStore((s) => s.hitlPlan);
  const hitlMessageId = useChatStore((s) => s.hitlMessageId);

  useEffect(() => {
    const store = useChatStore.getState();
    if (store.activeChatId !== chatId) {
      store.setActiveChatId(chatId);
    }
    if (messages.length > 0) {
      const lastAsstMsg = [...messages].reverse().find((m) => m.role === "assistant" && m.trace);
      if (lastAsstMsg?.trace && store.activeMessageId !== lastAsstMsg.id) {
        store.setActiveTrace(lastAsstMsg.trace);
        store.setActiveMessageId(lastAsstMsg.id);
      }
    }
  }, [chatId, messages]);

  const handlePipelineEvents = (liveTrace: any, event: StreamEvent) => {
    const currentStore = useChatStore.getState();
    if (event.type === "agent_status") {
      if (event.status === "started") {
        const statusKey = (event.agent as "planner" | "extractor" | "qa") || "planner";
        currentStore.setStreamingStatus(
          statusKey,
          statusKey === "planner"
            ? "Decomposing query steps & verifying keyword attention..."
            : statusKey === "extractor"
            ? "Retrieving ChromaDB chunks & computing NormEnsembleXAI attribution..."
            : "Synthesizing answer & computing citation heatmap..."
        );
      } else if (event.status === "retrying") {
        currentStore.setStreamingStatus(
          "planner",
          event.reason || "Attention check failed initial pass. Retrying decomposition..."
        );
      } else if (event.status === "awaiting_human_input") {
        currentStore.setStreamingStatus("planner", "Waiting for human review of the failed plan...");
      }
    } else if (event.type === "planner_result") {
      liveTrace.planner = event.data;
      currentStore.setActiveTrace({ ...liveTrace });
    } else if (event.type === "extractor_result") {
      liveTrace.extractor = event.data;
      currentStore.setActiveTrace({ ...liveTrace });
    } else if (event.type === "token") {
      currentStore.appendStreamingAnswerText(event.data);
    } else if (event.type === "qa_result") {
      liveTrace.qa = event.data;
      currentStore.setActiveTrace({ ...liveTrace });
    } else if (event.type === "awaiting_human_input") {
      currentStore.setHitl({
        pending: true,
        plan: (event.data?.plan as PlannerTrace) || liveTrace.planner,
        report: event.data?.verificationReport,
      });
    } else if (event.type === "done") {
      if (event.pending) {
        currentStore.setHitl({ pending: true, messageId: event.messageId || null });
        currentStore.setIsStreaming(false);
        invalidateMessages();
        toast.message("Planner paused — human review required.");
        return;
      }
      currentStore.setHitl({ pending: false, messageId: null, plan: null, report: null });
      currentStore.resetStream();
      invalidateMessages();
      if (event.messageId) currentStore.setActiveMessageId(event.messageId);
      toast.success("Query verified & synthesized successfully!");
    } else if (event.type === "error") {
      toast.error(event.message || "Query stream error");
      currentStore.resetStream();
    }
  };

  const handleSend = async (content: string) => {
    const store = useChatStore.getState();
    store.setIsStreaming(true);
    store.setStreamingAnswerText("");
    store.setHitl({ pending: false, plan: null, report: null, messageId: null });
    store.setStreamingStatus("planner", "Planner Agent extracting keywords & decomposing query...");

    queryClient.setQueryData(["messages", chatId, idToken], (old: any) => {
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
      const liveTrace: any = { planner: null, extractor: null, qa: null };
      await ApiClient.sendQueryStream(
        chatId,
        content,
        (event) => handlePipelineEvents(liveTrace, event),
        idToken || undefined,
        { verificationStrictness }
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to process query.");
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
      const liveTrace: any = { planner: store.hitlPlan, extractor: null, qa: null };
      await ApiClient.resumeQueryStream(
        chatId,
        messageId,
        body,
        (event) => handlePipelineEvents(liveTrace, event),
        idToken || undefined
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to resume pipeline.");
      useChatStore.getState().resetStream();
    }
  };

  return (
    <PageTransition className="flex-1 flex min-w-0 h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-app">
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

      {tracePanelOpen && <TracePanel trace={activeTrace} isLoading={isLoading} />}
    </PageTransition>
  );
}
