"use client";

import React, { useEffect, useRef } from "react";
import { Message } from "@/lib/api/types";
import { MessageBubble } from "./message-bubble";
import { EmptyState } from "../shared/empty-state";
import { useChatStore } from "@/lib/store/use-chat-store";
import { HexMark } from "../shared/hex-mark";

interface MessageListProps {
  messages: Message[];
  onSelectPrompt: (promptText: string) => void;
}

export function MessageList({ messages, onSelectPrompt }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isStreaming, streamingAnswerText, streamingStatus } = useChatStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingAnswerText, isStreaming]);

  if (messages.length === 0 && !isStreaming) {
    return <EmptyState onSelectPrompt={onSelectPrompt} />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* Live Answer Streaming Block */}
      {isStreaming && streamingAnswerText && (
        <div className="flex items-start space-x-3 mb-8 max-w-3xl animate-in fade-in-50">
          <div className="p-1 rounded-xl bg-surface border border-surface shadow-xs shrink-0 mt-1">
            <HexMark size="sm" glow />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-display font-semibold text-xs text-ink">RAGHive Agent</span>
              <span className="text-[10px] font-mono text-amber-500 animate-pulse">
                Generating Synthesized Answer...
              </span>
            </div>

            <div className="text-sm text-ink leading-relaxed font-sans whitespace-pre-wrap">
              {streamingAnswerText}
              <span className="inline-block w-2 h-4 ml-1 bg-amber-500 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
