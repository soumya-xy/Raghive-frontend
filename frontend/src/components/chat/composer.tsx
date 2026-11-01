"use client";

import React, { useRef, useState } from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import { useChatStore } from "@/lib/store/use-chat-store";
import { toast } from "sonner";
import { ApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils/cn";

interface ComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function Composer({ onSend, disabled = false }: ComposerProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming } = useChatStore();
  const { idToken } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const canSend = Boolean(input.trim()) && !disabled && !isStreaming;

  const resize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSend) return;
    onSend(input.trim());
    setInput("");
    requestAnimationFrame(resize);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const result = await ApiClient.uploadDocument(file, idToken || undefined);
      toast.success(`Added ${file.name}`, {
        description: `${result.chunkCount} chunks indexed for retrieval.`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Document upload failed");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 pb-5 pt-1">
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 rounded-[26px] border border-[var(--border-surface)] bg-[var(--bg-surface)] p-2 shadow-md transition-[border-color,box-shadow] focus-within:border-[var(--accent-primary-border)] focus-within:shadow-[var(--shadow-md),0_0_0_4px_var(--accent-primary-light)]"
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-ink"
          title="Attach a PDF, TXT, or Markdown file"
          aria-label="Attach document"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.txt,.md" className="hidden" onChange={handleFile} />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            resize();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your documents…"
          aria-label="Message"
          rows={1}
          disabled={disabled || isStreaming}
          className="max-h-[200px] min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[14px] leading-relaxed text-ink placeholder:text-[var(--text-muted)] focus:outline-none disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={!canSend}
          aria-label={isStreaming ? "Running" : "Send message"}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
            canSend
              ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-primary-hover)]"
              : "cursor-not-allowed bg-[var(--bg-subtle)] text-[var(--text-muted)]"
          )}
        >
          {isStreaming ? (
            <span className="h-3 w-3 animate-pulse rounded-[3px] bg-current" />
          ) : (
            <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
          )}
        </button>
      </form>
      <p className="mt-2 text-center text-[11px] text-[var(--text-muted)]">
        Every answer ships with its plan, evidence, and citations. Shift+Enter for a new line.
      </p>
    </div>
  );
}
