"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";

export default function NewChatPage() {
  const router = useRouter();
  const { idToken } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const chat = await ApiClient.createChat("New Conversation", idToken || undefined);
      router.replace(`/app/chat/${chat.id}`);
    })();
  }, [idToken, router]);

  return (
    <div className="flex-1 flex items-center justify-center text-xs font-mono text-muted">
      Opening a new conversation…
    </div>
  );
}
