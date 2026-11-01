"use client";

import React, { useEffect, useRef } from "react";
import { Message } from "@/lib/api/types";
import { MessageBubble } from "./message-bubble";
import { EmptyState } from "../shared/empty-state";
import { useChatStore } from "@/lib/store/use-chat-store";
import { HexMark } from "../shared/hex-mark";
import { MarkdownRenderer } from "./markdown-renderer";

interface MessageListProps {
  messages: Message[];
  onSelectPrompt: (promptText: string) => void;
}

export function MessageList({ messages, onSelectPrompt }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isStreaming, streamingAnswerText } = useChatStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingAnswerText, isStreaming]);

  if (messages.length === 0 && !isStreaming) {
    return <EmptyState onSelectPrompt={onSelectPrompt} />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[760px] space-y-8 px-6 pb-8 pt-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isStreaming && streamingAnswerText && (
          <div className="flex gap-3.5 animate-in fade-in-50">
            <div className="mt-0.5 shrink-0">
              <HexMark size="md" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-ink">RAGHive</span>
                <span className="text-[11px] text-[var(--text-muted)]">writing…</span>
              </div>
              <MarkdownRenderer content={streamingAnswerText} isStreaming />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
