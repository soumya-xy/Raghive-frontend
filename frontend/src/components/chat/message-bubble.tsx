"use client";

import React from "react";
import { Message } from "@/lib/api/types";
import { HexMark } from "../shared/hex-mark";
import { InlineVerificationBar } from "./inline-verification-bar";
import { MarkdownRenderer } from "./markdown-renderer";
import { User as UserIcon } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="flex items-start space-x-2 max-w-2xl">
          <div className="p-3.5 rounded-2xl rounded-tr-xs bg-amber-500/10 border border-amber-500/20 text-ink text-sm leading-relaxed shadow-xs whitespace-pre-wrap">
            {message.content}
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <UserIcon className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-3 mb-8 max-w-3xl">
      <div className="p-1 rounded-xl bg-surface border border-surface shadow-xs shrink-0 mt-1">
        <HexMark size="sm" glow />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center space-x-2">
          <span className="font-display font-semibold text-xs text-ink">RAGHive Agent</span>
          <span className="text-[10px] font-mono text-muted">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Rich Markdown Output */}
        <MarkdownRenderer content={message.content} />

        {/* Inline Verification Bar */}
        <InlineVerificationBar messageId={message.id} trace={message.trace} />
      </div>
    </div>
  );
}
