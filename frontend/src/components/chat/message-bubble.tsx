"use client";

import React from "react";
import { Message } from "@/lib/api/types";
import { HexMark } from "../shared/hex-mark";
import { InlineVerificationBar } from "./inline-verification-bar";
import { MarkdownRenderer } from "./markdown-renderer";

interface MessageBubbleProps {
  message: Message;
}

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-[20px] rounded-br-md bg-[var(--accent-primary-light)] px-4 py-2.5">
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--accent-contrast)]">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3.5">
      <div className="mt-0.5 shrink-0">
        <HexMark size="md" />
      </div>

      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">RAGHive</span>
          <span className="tabular text-[11px] text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100">
            {timeLabel(message.createdAt)}
          </span>
        </div>

        {message.content ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          <p className="text-[13px] italic text-[var(--text-muted)]">
            {message.pending ? "Waiting for review…" : "No answer was produced for this message."}
          </p>
        )}

        <InlineVerificationBar messageId={message.id} trace={message.trace} />
      </div>
    </div>
  );
}
