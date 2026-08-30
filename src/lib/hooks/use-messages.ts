import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "../api/client";
import { useAuth } from "./use-auth";

export function useMessages(chatId: string | null) {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery<{ chat: any; messages: any[] }>({
    queryKey: ["messages", chatId, idToken],
    queryFn: async () => {
      if (!chatId) return { chat: null, messages: [] };
      return await ApiClient.getChatById(chatId, idToken || undefined);
    },
    enabled: !!chatId,
  });

  const invalidateMessages = () => {
    queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
  };

  return {
    chat: messagesQuery.data?.chat || null,
    messages: messagesQuery.data?.messages || [],
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    invalidateMessages,
  };
}
