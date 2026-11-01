"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { HexMark } from "../shared/hex-mark";
import { useUIStore } from "@/lib/store/use-ui-store";
import { useChats } from "@/lib/hooks/use-chats";
import { useAuth } from "@/lib/hooks/use-auth";
import { useProfile } from "@/lib/hooks/use-profile";
import {
  Plus,
  Search,
  Pin,
  Trash2,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  User as UserIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";

const railButton =
  "flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-ink hover:shadow-xs";

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const { chats, createChat, updateChat, deleteChat } = useChats();
  const { signOut } = useAuth();
  const { displayName } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const handleNewChat = async () => {
    const newChat = await createChat("New Conversation");
    router.push(`/app/chat/${newChat.id}`);
  };

  const handleTogglePin = async (e: React.MouseEvent, chatId: string, currentPin: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    await updateChat({ chatId, data: { pinned: !currentPin } });
  };

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    e.preventDefault();
    await deleteChat(chatId);
  };

  const openSearch = () => {
    setSidebarOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pinnedChats = filteredChats.filter((c) => c.pinned);
  const unpinnedChats = filteredChats.filter((c) => !c.pinned);
  const initial = displayName ? displayName.trim()[0]?.toUpperCase() : "R";

  const account = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2.5 rounded-xl text-left transition-colors hover:bg-[var(--bg-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
            sidebarOpen ? "w-full p-1.5" : "p-1"
          )}
          aria-label="Account menu"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--mint)] text-[11px] font-semibold text-[var(--accent-secondary-text)]">
            {initial}
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{displayName || "Researcher"}</p>
              <p className="truncate text-[11px] text-[var(--text-muted)]">Academic plan</p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={sidebarOpen ? "end" : "start"} side={sidebarOpen ? "top" : "right"} className="w-52">
        <DropdownMenuItem onClick={() => router.push("/app/settings/profile")}>
          <UserIcon className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/app/settings/appearance")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-[var(--status-danger)]">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (!sidebarOpen) {
    return (
      <aside
        className="flex h-screen w-[64px] shrink-0 select-none flex-col items-center border-r border-[var(--border-surface)] bg-[var(--bg-sidebar)] py-3"
        aria-label="Conversation history (collapsed)"
      >
        <Link href="/app/chat" aria-label="RAGHive home" className="mb-3 flex h-9 w-9 items-center justify-center">
          <HexMark size="md" />
        </Link>

        <div className="flex flex-col items-center gap-1">
          <button onClick={toggleSidebar} className={railButton} title="Expand history (Ctrl+B)" aria-label="Expand history sidebar">
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <button
            onClick={handleNewChat}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-xs transition-colors hover:bg-[var(--accent-primary-hover)]"
            title="New chat"
            aria-label="New conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={openSearch} className={railButton} title="Search conversations" aria-label="Search conversations">
            <Search className="h-4 w-4" />
          </button>
          <Link
            href="/app/history"
            className={cn(railButton, pathname === "/app/history" && "bg-[var(--bg-surface)] text-ink shadow-xs")}
            title="History"
            aria-label="History"
          >
            <Clock className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-auto">{account}</div>
      </aside>
    );
  }

  return (
    <aside
      className="flex h-screen w-[264px] shrink-0 select-none flex-col border-r border-[var(--border-surface)] bg-[var(--bg-sidebar)]"
      aria-label="Conversation history"
    >
      {/* Brand + collapse */}
      <div className="flex h-14 items-center justify-between pl-4 pr-2.5">
        <Link href="/app/chat" className="flex min-w-0 items-center gap-2.5" aria-label="RAGHive home">
          <HexMark size="md" />
          <span className="font-display truncate text-[16px] font-semibold tracking-tight text-ink">RAGHive</span>
        </Link>
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface)] hover:text-ink"
          title="Collapse history (Ctrl+B)"
          aria-label="Collapse history sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* New chat + search */}
      <div className="space-y-2 px-3 pb-3">
        <button
          onClick={handleNewChat}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] text-[13px] font-medium text-[var(--accent-contrast)] shadow-xs transition-colors hover:bg-[var(--accent-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search conversations"
            className="h-9 w-full rounded-xl border border-transparent bg-[var(--bg-subtle)] pl-8 pr-3 text-[13px] text-ink transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent-ring)] focus:bg-[var(--bg-surface)] focus:outline-none"
          />
        </div>
      </div>

      {/* Lists */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {pinnedChats.length > 0 && (
          <div className="mb-3">
            <SectionLabel label="Pinned" />
            {pinnedChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                active={pathname === `/app/chat/${chat.id}`}
                onPin={handleTogglePin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
        <SectionLabel label="Recents" />
        {unpinnedChats.length === 0 ? (
          <p className="px-3 py-3 text-[12px] text-[var(--text-muted)]">
            {searchQuery ? "No matching conversations" : "No conversations yet"}
          </p>
        ) : (
          unpinnedChats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              active={pathname === `/app/chat/${chat.id}`}
              onPin={handleTogglePin}
              onDelete={handleDelete}
            />
          ))
        )}
      </nav>

      <div className="space-y-1 border-t border-[var(--border-surface)] p-2">
        <Link
          href="/app/history"
          className={cn(
            "flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] transition-colors",
            pathname === "/app/history"
              ? "bg-[var(--bg-surface)] font-medium text-ink shadow-xs"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-ink"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          All history
        </Link>
        {account}
      </div>
    </aside>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pb-1 pt-2 text-[11px] font-medium text-[var(--text-muted)]">{label}</div>
  );
}

function ChatItem({
  chat,
  active,
  onPin,
  onDelete,
}: {
  chat: { id: string; title: string; pinned: boolean };
  active: boolean;
  onPin: (e: React.MouseEvent, id: string, pin: boolean) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <Link
      href={`/app/chat/${chat.id}`}
      className={cn(
        "group relative flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[13px] transition-colors",
        active
          ? "bg-[var(--accent-primary-light)] font-medium text-[var(--accent-contrast)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-ink"
      )}
    >
      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[var(--accent-primary)]" />}
      <span className="truncate">{chat.title}</span>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          onClick={(e) => onPin(e, chat.id, chat.pinned)}
          className={cn(
            "rounded-md p-1 transition-colors hover:bg-[var(--bg-subtle)]",
            chat.pinned ? "text-[var(--accent-text)]" : "text-[var(--text-muted)] hover:text-ink"
          )}
          title={chat.pinned ? "Unpin" : "Pin"}
          aria-label={chat.pinned ? "Unpin conversation" : "Pin conversation"}
        >
          <Pin className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => onDelete(e, chat.id)}
          className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger)]"
          title="Delete"
          aria-label="Delete conversation"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </Link>
  );
}
