"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useChats } from "@/lib/hooks/use-chats";
import { PageTransition } from "@/components/shared/page-transition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Grid,
  List,
  Pin,
  Trash2,
  Download,
  Filter,
  MessageSquare,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export default function HistoryPage() {
  const { chats, deleteChat } = useChats();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredChats = chats.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchesPin = !pinnedOnly || c.pinned;
    return matchesSearch && matchesPin;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredChats.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteChat(id);
    }
    toast.success(`Deleted ${selectedIds.length} chat sessions.`);
    setSelectedIds([]);
  };

  const handleExportJSON = () => {
    const exportData = chats.filter((c) => selectedIds.includes(c.id));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raghive-history-export-${Date.now()}.json`;
    a.click();
    toast.success(`Exported ${selectedIds.length} sessions as JSON.`);
  };

  return (
    <PageTransition className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Conversation History</h1>
          <p className="text-xs text-muted font-mono mt-1">
            Manage, filter, and export verified multi-agent RAG sessions
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {selectedIds.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportJSON} className="font-mono text-xs">
                <Download className="w-3.5 h-3.5 mr-1" />
                Export ({selectedIds.length})
              </Button>
              <Button variant="danger" size="sm" onClick={handleBulkDelete} className="font-mono text-xs">
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete ({selectedIds.length})
              </Button>
            </>
          )}

          <div className="flex items-center p-1 rounded-lg border border-surface bg-surface">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded cursor-pointer ${
                viewMode === "table" ? "bg-amber-500/15 text-amber-500" : "text-muted"
              }`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded cursor-pointer ${
                viewMode === "grid" ? "bg-amber-500/15 text-amber-500" : "text-muted"
              }`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic, keyword, or title..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setPinnedOnly(!pinnedOnly)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
              pinnedOnly
                ? "bg-amber-500/15 border-amber-500/40 text-amber-500"
                : "border-surface bg-surface text-muted"
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
            <span>Pinned Only</span>
          </button>
        </div>
      </div>

      {/* Content View */}
      {filteredChats.length === 0 ? (
        <div className="p-12 text-center border border-surface rounded-2xl bg-surface/50 space-y-3">
          <MessageSquare className="w-10 h-10 text-muted mx-auto" />
          <h3 className="font-display font-semibold text-ink">No Sessions Found</h3>
          <p className="text-xs text-muted">Try adjusting your query or start a new conversation.</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="rounded-2xl border border-surface bg-surface overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface bg-app/50 font-mono text-[11px] text-muted uppercase">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredChats.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                </th>
                <th className="p-4">Conversation Title</th>
                <th className="p-4">Last Updated</th>
                <th className="p-4">Messages</th>
                <th className="p-4">Avg Faithfulness</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface text-xs font-mono">
              {filteredChats.map((chat) => (
                <tr key={chat.id} className="hover:bg-amber-500/5 transition-colors group">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(chat.id)}
                      onChange={() => handleSelectOne(chat.id)}
                      className="rounded accent-amber-500"
                    />
                  </td>
                  <td className="p-4 font-sans font-semibold text-ink">
                    <Link
                      href={`/app/chat/${chat.id}`}
                      className="hover:text-amber-500 transition-colors flex items-center space-x-2"
                    >
                      {chat.pinned && <Pin className="w-3 h-3 text-amber-500" />}
                      <span>{chat.title}</span>
                    </Link>
                  </td>
                  <td className="p-4 text-muted">
                    {new Date(chat.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-ink">{chat.messageCount} msgs</td>
                  <td className="p-4">
                    {chat.avgFaithfulness ? (
                      <Badge variant="success">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {Math.round(chat.avgFaithfulness * 100)}%
                      </Badge>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/app/chat/${chat.id}`}>
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className="p-5 rounded-2xl border border-surface bg-surface hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 shadow-xs group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted">
                    {new Date(chat.updatedAt).toLocaleDateString()}
                  </span>
                  {chat.pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <h3 className="font-display font-semibold text-sm text-ink group-hover:text-amber-500 transition-colors line-clamp-2">
                  {chat.title}
                </h3>
              </div>

              <div className="pt-3 border-t border-surface flex items-center justify-between">
                <span className="text-xs font-mono text-muted">{chat.messageCount} messages</span>
                <Button asChild variant="outline" size="sm" className="font-mono text-xs">
                  <Link href={`/app/chat/${chat.id}`}>
                    <span>View Trace</span>
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
