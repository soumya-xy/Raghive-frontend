import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "../api/client";
import { USE_MOCK_API } from "../api/mock/mock-mode";
import { useAuth } from "./use-auth";

/**
 * The saved profile from the backend (source of truth for the display name in the app).
 * Falls back to the identity-provider name until the profile is loaded, and always in mock mode.
 */
export function useProfile() {
  const { user, idToken } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["me", idToken],
    queryFn: () => ApiClient.getMe(idToken || undefined),
    enabled: !USE_MOCK_API && !!idToken,
  });

  const displayName =
    profileQuery.data?.displayName || user?.displayName || "Researcher";
  const email = profileQuery.data?.email || user?.email || "";

  return {
    displayName,
    email,
    isLoading: profileQuery.isLoading,
    /** Call after saving a profile change so every consumer re-reads it. */
    refresh: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  };
}
