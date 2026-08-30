"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChats } from "@/lib/hooks/use-chats";

export default function ChatIndexPage() {
  const router = useRouter();
  const { chats, isLoading } = useChats();

  useEffect(() => {
    if (!isLoading) {
      if (chats.length > 0) {
        router.replace(`/app/chat/${chats[0].id}`);
      } else {
        router.replace("/app/chat/new");
      }
    }
  }, [chats, isLoading, router]);

  return null;
}
