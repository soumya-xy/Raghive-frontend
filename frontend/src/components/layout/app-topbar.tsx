"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { ShieldCheck, Pencil, Check, X } from "lucide-react";
import { useChats } from "@/lib/hooks/use-chats";

interface AppTopbarProps {
  chatId?: string;
  currentTitle?: string;
}

export function AppTopbar({ chatId: chatIdProp, currentTitle: titleProp }: AppTopbarProps) {
  const pathname = usePathname();
  const { chats, updateChat } = useChats();

  const routeMatch = pathname?.match(/^\/app\/chat\/([^/]+)$/);
  const routeChatId = routeMatch && routeMatch[1] !== "new" ? routeMatch[1] : undefined;
  const chatId = chatIdProp ?? routeChatId;
  const activeChat = chatId ? chats.find((c) => c.id === chatId) : undefined;
  const currentTitle = titleProp ?? activeChat?.title ?? "New chat";

  const [isEditing, setIsEditing] = useState(false);
  // Seed the draft from the live title only when editing starts, so API updates
  // never clobber what the user is typing.
  const [draft, setDraft] = useState("");
  const title = isEditing ? draft : currentTitle;

  const handleStartEditing = () => {
    setDraft(currentTitle);
    setIsEditing(true);
  };

  const handleSaveTitle = async () => {
    setIsEditing(false);
    if (chatId && title.trim() && title.trim() !== currentTitle) {
      await updateChat({ chatId, data: { title: title.trim() } });
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-5">
      <div className="flex min-w-0 items-center gap-2">
        {isEditing ? (
          <div className="flex min-w-0 items-center gap-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") setIsEditing(false);
              }}
              autoFocus
              aria-label="Conversation title"
              className="min-w-0 max-w-[420px] rounded-lg border border-[var(--accent-ring)] bg-[var(--bg-surface)] px-2.5 py-1 text-[14px] font-medium text-ink focus:outline-none"
            />
            <button
              onClick={handleSaveTitle}
              className="rounded-md p-1 text-[var(--status-success)] hover:bg-[var(--bg-subtle)]"
              aria-label="Save title"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-ink"
              aria-label="Cancel rename"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartEditing}
            disabled={!chatId}
            className="group flex min-w-0 items-center gap-1.5 truncate rounded-lg px-2 py-1 text-[14px] font-medium text-ink transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-default disabled:hover:bg-transparent"
            title={chatId ? "Rename conversation" : undefined}
          >
            <span className="max-w-[46ch] truncate">{currentTitle}</span>
            {chatId && (
              <Pencil className="h-3 w-3 shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </button>
        )}
      </div>

      <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-[var(--mint)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-secondary-text)] md:inline-flex">
        <ShieldCheck className="h-3.5 w-3.5" />
        Glass-box on
      </span>
    </header>
  );
}
