import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "../api/client";
import { useAuth } from "./use-auth";

export function useChats() {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  const chatsQuery = useQuery({
    queryKey: ["chats", idToken],
    queryFn: () => ApiClient.getChats(idToken || undefined),
  });

  const createChatMutation = useMutation({
    mutationFn: (title?: string) => ApiClient.createChat(title, idToken || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const updateChatMutation = useMutation({
    mutationFn: ({
      chatId,
      data,
    }: {
      chatId: string;
      data: { title?: string; pinned?: boolean; archived?: boolean };
    }) => ApiClient.updateChat(chatId, data, idToken || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: (chatId: string) => ApiClient.deleteChat(chatId, idToken || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  return {
    chats: chatsQuery.data?.items || [],
    isLoading: chatsQuery.isLoading,
    isError: chatsQuery.isError,
    createChat: createChatMutation.mutateAsync,
    updateChat: updateChatMutation.mutateAsync,
    deleteChat: deleteChatMutation.mutateAsync,
  };
}
