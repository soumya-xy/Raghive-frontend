"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Sparkles, StopCircle } from "lucide-react";
import { Button } from "../ui/button";
import { useChatStore } from "@/lib/store/use-chat-store";
import { toast } from "sonner";

interface ComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function Composer({ onSend, disabled = false }: ComposerProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming } = useChatStore();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || disabled || isStreaming) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAttachClick = () => {
    toast.info("Document Upload (PyMuPDF Chunking)", {
      description: "PDF ingestion is active on backend vector database.",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto px-4 pb-4">
      <div className="relative rounded-2xl border border-surface bg-surface p-2.5 shadow-lg focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a multi-hop or technical question... (Watch Planner, Extractor & QA show their work)"
          rows={1}
          disabled={disabled || isStreaming}
          className="w-full resize-none bg-transparent px-2 py-1 text-sm text-ink placeholder:text-muted focus:outline-none disabled:opacity-50 min-h-[44px] max-h-[200px]"
        />

        <div className="flex items-center justify-between pt-2 px-2 border-t border-surface/50">
          <div className="flex items-center space-x-2 text-xs font-mono text-muted">
            <button
              type="button"
              onClick={handleAttachClick}
              className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted hover:text-ink transition-colors cursor-pointer"
              title="Attach Document PDF"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <span className="hidden sm:inline-block text-[11px]">
              Qwen2.5-32B • Glass-Box Mode Active
            </span>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || disabled || isStreaming}
            variant="amber"
            className="rounded-xl px-3 font-semibold"
          >
            {isStreaming ? (
              <>
                <StopCircle className="w-4 h-4 mr-1 animate-pulse text-white" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <Send className="w-3.5 h-3.5 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
