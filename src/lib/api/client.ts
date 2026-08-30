import { USE_MOCK_API } from "./mock/mock-mode";
import { MOCK_CHATS, MOCK_MESSAGES_MAP } from "./mock/mock-chats";
import { MOCK_TRACE_INCEPTION, MOCK_TRACE_RETRY, MOCK_TRACE_MEDIUM } from "./mock/mock-trace";
import { ChatSummary, Message, ReasoningTrace, UserPreferences, UserProfile, StreamEvent } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Helper delay for mock API artificial latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ApiClient {
  private static async getHeaders(token?: string): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  static async getChats(token?: string): Promise<{ items: ChatSummary[]; nextCursor: string | null }> {
    if (USE_MOCK_API) {
      await delay(450);
      return { items: MOCK_CHATS, nextCursor: null };
    }
    const res = await fetch(`${BASE_URL}/api/v1/chats`, {
      headers: await this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Failed to fetch chats");
    return res.json();
  }

  static async getChatById(
    chatId: string,
    token?: string
  ): Promise<{ chat: ChatSummary; messages: Message[] }> {
    if (USE_MOCK_API) {
      await delay(400);
      const chat = MOCK_CHATS.find((c) => c.id === chatId) || MOCK_CHATS[0];
      const messages = MOCK_MESSAGES_MAP[chatId] || MOCK_MESSAGES_MAP["chat_inception_101"];
      return { chat, messages };
    }
    const res = await fetch(`${BASE_URL}/api/v1/chats/${chatId}`, {
      headers: await this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Failed to fetch chat");
    return res.json();
  }

  static async createChat(title?: string, token?: string): Promise<ChatSummary> {
    if (USE_MOCK_API) {
      await delay(350);
      const newChat: ChatSummary = {
        id: `chat_${Date.now()}`,
        title: title || "New Conversation",
        updatedAt: new Date().toISOString(),
        pinned: false,
        messageCount: 0,
      };
      MOCK_CHATS.unshift(newChat);
      MOCK_MESSAGES_MAP[newChat.id] = [];
      return newChat;
    }
    const res = await fetch(`${BASE_URL}/api/v1/chats`, {
      method: "POST",
      headers: await this.getHeaders(token),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to create chat");
    return res.json();
  }

  static async updateChat(
    chatId: string,
    data: { title?: string; pinned?: boolean; archived?: boolean },
    token?: string
  ): Promise<ChatSummary> {
    if (USE_MOCK_API) {
      await delay(300);
      const chat = MOCK_CHATS.find((c) => c.id === chatId);
      if (chat) {
        if (data.title !== undefined) chat.title = data.title;
        if (data.pinned !== undefined) chat.pinned = data.pinned;
      }
      return chat || MOCK_CHATS[0];
    }
    const res = await fetch(`${BASE_URL}/api/v1/chats/${chatId}`, {
      method: "PATCH",
      headers: await this.getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update chat");
    return res.json();
  }

  static async deleteChat(chatId: string, token?: string): Promise<void> {
    if (USE_MOCK_API) {
      await delay(350);
      const index = MOCK_CHATS.findIndex((c) => c.id === chatId);
      if (index !== -1) MOCK_CHATS.splice(index, 1);
      delete MOCK_MESSAGES_MAP[chatId];
      return;
    }
    const res = await fetch(`${BASE_URL}/api/v1/chats/${chatId}`, {
      method: "DELETE",
      headers: await this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Failed to delete chat");
  }

  /**
   * Stream a query response from the Multi-Agent Pipeline.
   * Dispatches typed events: agent status transitions, trace payloads, token streaming, completion.
   */
  static async sendQueryStream(
    chatId: string,
    content: string,
    onEvent: (event: StreamEvent) => void,
    token?: string
  ): Promise<void> {
    if (USE_MOCK_API) {
      // 1. Planner Agent Start
      onEvent({ type: "agent_status", agent: "planner", status: "started" });
      await delay(600);

      // Randomly pick sample trace or matching trace
      const trace: ReasoningTrace =
        content.toLowerCase().includes("power") || content.toLowerCase().includes("grid")
          ? MOCK_TRACE_RETRY
          : content.toLowerCase().includes("xai") || content.toLowerCase().includes("norm")
          ? MOCK_TRACE_MEDIUM
          : MOCK_TRACE_INCEPTION;

      if (trace.planner.retried) {
        onEvent({ type: "agent_status", agent: "planner", status: "retrying" });
        await delay(500);
      }

      onEvent({ type: "planner_result", data: trace.planner });
      onEvent({ type: "agent_status", agent: "planner", status: "done" });

      // 2. Extractor Agent Start
      await delay(300);
      onEvent({ type: "agent_status", agent: "extractor", status: "started" });
      await delay(700);
      onEvent({ type: "extractor_result", data: trace.extractor });
      onEvent({ type: "agent_status", agent: "extractor", status: "done" });

      // 3. QA Agent Start
      await delay(300);
      onEvent({ type: "agent_status", agent: "qa", status: "started" });
      await delay(400);

      // Stream answer text token by token
      const tokens = trace.qa.answer.split(" ");
      for (const tok of tokens) {
        onEvent({ type: "token", data: tok + " " });
        await delay(40);
      }

      onEvent({ type: "qa_result", data: trace.qa });
      onEvent({ type: "agent_status", agent: "qa", status: "done" });

      const newMsgId = `msg_asst_${Date.now()}`;

      // Save to mock storage
      if (!MOCK_MESSAGES_MAP[chatId]) MOCK_MESSAGES_MAP[chatId] = [];
      MOCK_MESSAGES_MAP[chatId].push(
        {
          id: `msg_user_${Date.now()}`,
          role: "user",
          content,
          createdAt: new Date().toISOString(),
        },
        {
          id: newMsgId,
          role: "assistant",
          content: trace.qa.answer,
          createdAt: new Date().toISOString(),
          trace,
        }
      );

      onEvent({ type: "done", messageId: newMsgId });
      return;
    }

    // Real Server Sent Events implementation
    const response = await fetch(`${BASE_URL}/api/v1/chats/${chatId}/messages`, {
      method: "POST",
      headers: await this.getHeaders(token),
      body: JSON.stringify({ content }),
    });

    if (!response.body) throw new Error("No response body for SSE stream");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((l) => l.trim().startsWith("data:"));
      for (const line of lines) {
        try {
          const json = JSON.parse(line.replace("data:", "").trim());
          onEvent(json);
        } catch (e) {
          console.error("Failed to parse SSE event", e);
        }
      }
    }
  }
}
