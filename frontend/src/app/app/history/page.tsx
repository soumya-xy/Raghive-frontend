"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useChats } from "@/lib/hooks/use-chats";
import { PageTransition } from "@/components/shared/page-transition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Pin, Trash2, Download, MessageSquare, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

export default function HistoryPage() {
  const { chats, deleteChat } = useChats();
  const [search, setSearch] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredChats = useMemo(
    () =>
      chats.filter(
        (c) => c.title.toLowerCase().includes(search.toLowerCase()) && (!pinnedOnly || c.pinned)
      ),
    [chats, search, pinnedOnly]
  );

  const allSelected = filteredChats.length > 0 && selectedIds.length === filteredChats.length;

  const toggleAll = () => setSelectedIds(allSelected ? [] : filteredChats.map((c) => c.id));

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteChat(id);
    }
    toast.success(`Deleted ${selectedIds.length} conversation${selectedIds.length === 1 ? "" : "s"}`);
    setSelectedIds([]);
  };

  const handleExportJSON = () => {
    const payload = chats.filter((c) => selectedIds.includes(c.id));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raghive-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${payload.length} conversation${payload.length === 1 ? "" : "s"}`);
  };

  return (
    <PageTransition className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-6 py-8">
      <div className="flex flex-col gap-3 border-b border-[var(--border-surface)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">History</h1>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            {chats.length} conversation{chats.length === 1 ? "" : "s"} saved.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="h-3.5 w-3.5" />
              Export ({selectedIds.length})
            </Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="pl-8"
          />
        </div>

        <button
          onClick={() => setPinnedOnly(!pinnedOnly)}
          aria-pressed={pinnedOnly}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition-colors",
            pinnedOnly
              ? "border-[var(--accent-primary-border)] bg-[var(--accent-primary-light)] text-[var(--accent-text)]"
              : "border-[var(--border-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          )}
        >
          <Pin className="h-3 w-3" />
          Pinned only
        </button>
      </div>

      {filteredChats.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--border-surface)] px-6 py-14 text-center">
          <MessageSquare className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
          <p className="mt-3 text-[13px] font-medium text-ink">No conversations found</p>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            Try a different search, or start a new conversation.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border-surface)]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-surface)] bg-[var(--bg-subtle)]">
                <th className="w-9 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all conversations"
                    className="h-3.5 w-3.5 rounded accent-[var(--accent-primary)]"
                  />
                </th>
                <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Conversation
                </th>
                <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Updated
                </th>
                <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Messages
                </th>
                <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Grounding
                </th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-surface)] bg-[var(--bg-surface)]">
              {filteredChats.map((chat) => (
                <tr key={chat.id} className="group transition-colors hover:bg-[var(--bg-subtle)]/60">
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(chat.id)}
                      onChange={() => toggleOne(chat.id)}
                      aria-label={`Select ${chat.title}`}
                      className="h-3.5 w-3.5 rounded accent-[var(--accent-primary)]"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/app/chat/${chat.id}`}
                      className="flex items-center gap-1.5 text-[13px] text-ink hover:text-[var(--accent-text)] transition-colors"
                    >
                      {chat.pinned && <Pin className="h-3 w-3 shrink-0 text-[var(--accent-text)]" />}
                      <span className="truncate max-w-[42ch]">{chat.title}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--text-muted)] tabular">
                    {new Date(chat.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--text-secondary)] tabular">
                    {chat.messageCount}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] tabular">
                    {chat.avgFaithfulness != null ? (
                      <span className="text-[var(--text-secondary)]">
                        {Math.round(chat.avgFaithfulness * 100)}%
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/app/chat/${chat.id}`}
                      className="inline-flex text-[var(--text-muted)] opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
                      aria-label={`Open ${chat.title}`}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageTransition>
  );
}
