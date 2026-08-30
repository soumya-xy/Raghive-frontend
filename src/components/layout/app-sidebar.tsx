"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { HexMark } from "../shared/hex-mark";
import { useUIStore } from "@/lib/store/use-ui-store";
import { useChats } from "@/lib/hooks/use-chats";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Plus,
  Search,
  MessageSquare,
  Pin,
  Trash2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Clock,
  User as UserIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";

export function SidebarTrigger() {
  const { toggleSidebar, sidebarOpen } = useUIStore();
  return (
    <button
      onClick={toggleSidebar}
      className="p-1.5 rounded-lg border border-surface bg-surface text-muted hover:text-ink cursor-pointer transition-colors"
      title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
    >
      {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </button>
  );
}

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { chats, createChat, updateChat, deleteChat } = useChats();
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const handleNewChat = async () => {
    const newChat = await createChat("New Conversation");
    router.push(`/app/chat/${newChat.id}`);
  };

  const handleTogglePin = async (e: React.MouseEvent, chatId: string, currentPin: boolean) => {
    e.stopPropagation();
    await updateChat({ chatId, data: { pinned: !currentPin } });
  };

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    await deleteChat(chatId);
  };

  // Filter & group chats by recency
  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedChats = filteredChats.filter((c) => c.pinned);
  const unpinnedChats = filteredChats.filter((c) => !c.pinned);

  return (
    <aside
      className={cn(
        "h-screen bg-surface border-r border-surface flex flex-col transition-all duration-300 z-40 shrink-0 select-none",
        sidebarOpen ? "w-64" : "w-16 items-center"
      )}
    >
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-surface">
        <Link href="/app/chat" className="flex items-center space-x-2.5 group">
          <HexMark size={sidebarOpen ? "md" : "sm"} glow />
          {sidebarOpen && (
            <span className="font-display font-bold text-lg tracking-tight text-ink group-hover:text-amber-500 transition-colors">
              RAGHive
            </span>
          )}
        </Link>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          variant="amber"
          className={cn("w-full justify-center font-semibold text-xs shadow-sm", !sidebarOpen && "px-0")}
        >
          <Plus className="w-4 h-4" />
          {sidebarOpen && <span>New Conversation</span>}
        </Button>
      </div>

      {/* Search Bar */}
      {sidebarOpen && (
        <div className="px-3 mb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-app border border-surface rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      )}

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4">
        {/* Pinned Section */}
        {sidebarOpen && pinnedChats.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1">
              <Pin className="w-3 h-3" />
              <span>Pinned</span>
            </div>
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

        {/* History Group */}
        {sidebarOpen && (
          <div>
            <div className="px-2 py-1 text-[10px] font-mono font-semibold text-muted uppercase tracking-wider flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Recent Chats</span>
            </div>
            {unpinnedChats.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted font-mono italic text-center">
                No history yet
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
          </div>
        )}
      </div>

      {/* User Footer Profile Card */}
      <div className="p-3 border-t border-surface bg-surface">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-amber-500/10 cursor-pointer transition-colors text-left focus:outline-none">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 font-mono font-bold text-xs">
                {user?.displayName ? user.displayName[0] : "R"}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink truncate">
                    {user?.displayName || "Research User"}
                  </p>
                  <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                    Academic Plan
                  </span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push("/app/settings/profile")}>
              <UserIcon className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/app/settings/appearance")}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-rose-500 focus:text-rose-400">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

function ChatItem({
  chat,
  active,
  onPin,
  onDelete,
}: {
  chat: any;
  active: boolean;
  onPin: (e: any, id: string, pin: boolean) => void;
  onDelete: (e: any, id: string) => void;
}) {
  return (
    <Link
      href={`/app/chat/${chat.id}`}
      className={cn(
        "group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer my-0.5",
        active
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
          : "text-ink hover:bg-amber-500/10 hover:text-amber-500"
      )}
    >
      <div className="flex items-center space-x-2 truncate pr-2">
        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted group-hover:text-amber-500" />
        <span className="truncate">{chat.title}</span>
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
        <button
          onClick={(e) => onPin(e, chat.id, chat.pinned)}
          className="p-1 hover:text-amber-500 text-muted rounded"
          title={chat.pinned ? "Unpin" : "Pin"}
        >
          <Pin className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => onDelete(e, chat.id)}
          className="p-1 hover:text-rose-500 text-muted rounded"
          title="Delete chat"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </Link>
  );
}
