"use client";

import React, { useEffect, use } from "react";
import { useMessages } from "@/lib/hooks/use-messages";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";
import { AgentStatusIndicator } from "@/components/chat/agent-status-indicator";
import { TracePanel } from "@/components/trace/trace-panel";
import { useUIStore } from "@/lib/store/use-ui-store";
import { useChatStore } from "@/lib/store/use-chat-store";
import { ApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { PageTransition } from "@/components/shared/page-transition";
import { toast } from "sonner";

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const resolvedParams = use(params);
  const chatId = resolvedParams.chatId;

  const { idToken } = useAuth();
  const { messages, isLoading, invalidateMessages } = useMessages(chatId);
  const { tracePanelOpen } = useUIStore();

  const activeTrace = useChatStore((s) => s.activeTrace);

  // Set initial active chat & trace from last assistant message with equality checks
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

  const handleSend = async (content: string) => {
    const store = useChatStore.getState();
    store.setIsStreaming(true);
    store.setStreamingAnswerText("");
    store.setStreamingStatus("planner", "Planner Agent extracting keywords & decomposing query...");

    try {
      let liveTrace: any = { planner: null, extractor: null, qa: null };

      await ApiClient.sendQueryStream(
        chatId,
        content,
        (event) => {
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
              currentStore.setStreamingStatus("planner", "Attention check failed initial pass. Retrying decomposition...");
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
          } else if (event.type === "done") {
            currentStore.resetStream();
            invalidateMessages();
            if (event.messageId) currentStore.setActiveMessageId(event.messageId);
            toast.success("Query verified & synthesized successfully!");
          } else if (event.type === "error") {
            toast.error(event.message || "Query stream error");
            currentStore.resetStream();
          }
        },
        idToken || undefined
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to process query.");
      useChatStore.getState().resetStream();
    }
  };

  return (
    <PageTransition className="flex-1 flex min-w-0 h-full overflow-hidden">
      {/* Conversation Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-app">
        <MessageList messages={messages} onSelectPrompt={handleSend} />
        <AgentStatusIndicator />
        <Composer onSend={handleSend} disabled={isLoading} />
      </div>

      {/* Signature Reasoning Trace Panel */}
      {tracePanelOpen && (
        <TracePanel trace={activeTrace} isLoading={isLoading} />
      )}
    </PageTransition>
  );
}
