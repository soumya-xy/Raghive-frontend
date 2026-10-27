"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "./app-sidebar";
import { useUIStore } from "@/lib/store/use-ui-store";
import { Layers, ShieldCheck, Edit3, Check, X } from "lucide-react";
import { Button } from "../ui/button";
import { useChats } from "@/lib/hooks/use-chats";

interface AppTopbarProps {
  chatId?: string;
  currentTitle?: string;
}

export function AppTopbar({ chatId: chatIdProp, currentTitle: titleProp }: AppTopbarProps) {
  const pathname = usePathname();
  const { tracePanelOpen, toggleTracePanel } = useUIStore();
  const { chats, updateChat } = useChats();

  // Derive the active chat from the route (/app/chat/[chatId]) when not passed explicitly.
  const routeMatch = pathname?.match(/^\/app\/chat\/([^/]+)$/);
  const routeChatId = routeMatch && routeMatch[1] !== "new" ? routeMatch[1] : undefined;
  const chatId = chatIdProp ?? routeChatId;
  const activeChat = chatId ? chats.find((c) => c.id === chatId) : undefined;
  const currentTitle = titleProp ?? activeChat?.title ?? "New Conversation";

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle);

  const handleStartEditing = () => {
    setTitle(currentTitle);
    setIsEditing(true);
  };

  const handleSaveTitle = async () => {
    setIsEditing(false);
    if (chatId && title.trim() && title.trim() !== currentTitle) {
      await updateChat({ chatId, data: { title: title.trim() } });
    }
  };

  return (
    <header className="h-14 border-b border-surface bg-surface/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
      <div className="flex items-center space-x-3 min-w-0">
        <SidebarTrigger />

        {/* Chat Title (Inline Editable) */}
        <div className="flex items-center space-x-2 truncate">
          {isEditing ? (
            <div className="flex items-center space-x-1">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                autoFocus
                className="bg-app border border-amber-500/50 rounded px-2 py-0.5 text-xs font-semibold text-ink focus:outline-none"
              />
              <button onClick={handleSaveTitle} className="p-1 text-emerald-500 hover:text-emerald-400">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsEditing(false)} className="p-1 text-muted hover:text-ink">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartEditing}
              disabled={!chatId}
              className="flex items-center space-x-1.5 font-display font-semibold text-xs md:text-sm text-ink truncate hover:text-amber-500 transition-colors group cursor-pointer disabled:cursor-default disabled:hover:text-ink"
              title={chatId ? "Click to rename chat" : undefined}
            >
              <span className="truncate">{currentTitle}</span>
              {chatId && (
                <Edit3 className="w-3 h-3 text-muted group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3 shrink-0">
        {/* Global Verification Status Pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Glass-Box Mode: Active</span>
        </div>

        {/* Toggle Reasoning Trace Panel Button */}
        <Button
          variant={tracePanelOpen ? "amber" : "outline"}
          size="sm"
          onClick={toggleTracePanel}
          className="text-xs font-mono"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden md:inline">
            {tracePanelOpen ? "Hide Trace" : "Show Reasoning Trace"}
          </span>
        </Button>
      </div>
    </header>
  );
}
