export const API_ENDPOINTS = {
  AUTH_SESSION: "/api/v1/auth/session",
  CHATS: "/api/v1/chats",
  CHAT_BY_ID: (chatId: string) => `/api/v1/chats/${chatId}`,
  MESSAGES: (chatId: string) => `/api/v1/chats/${chatId}/messages`,
  TRACE_BY_MESSAGE: (chatId: string, messageId: string) =>
    `/api/v1/chats/${chatId}/messages/${messageId}/trace`,
  QUERY: "/api/v1/query",
  USER_PREFERENCES: "/api/v1/users/me/preferences",
  USER_ME: "/api/v1/users/me",
  DOCUMENTS: "/api/v1/documents",
  HEALTH: "/api/v1/health",
  RESUME: (chatId: string, messageId: string) =>
    `/api/v1/chats/${chatId}/messages/${messageId}/resume`,
};
