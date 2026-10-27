"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { subscribeToIdToken } from "./auth";
import { USE_MOCK_AUTH } from "../api/mock/mock-mode";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  signOut: () => Promise<void>;
  mockLogin: (name?: string, email?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  idToken: null,
  signOut: async () => {},
  mockLogin: () => {},
});

const MOCK_USER: Partial<User> = {
  uid: "usr_raghive_demo_101",
  email: "researcher@lnmiit.ac.in",
  displayName: "Dr. Soumya Jain",
  photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=RAGHive",
  getIdToken: async () => "mock_firebase_id_token_raghive_bearer_12345",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If mock mode or demo key, set mock user as default
    if (USE_MOCK_AUTH) {
      setUser(MOCK_USER as User);
      setIdToken("mock_firebase_id_token_raghive_bearer_12345");
      setLoading(false);
      return;
    }

    // onIdTokenChanged also fires on Firebase's periodic token refresh (tokens expire hourly).
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToIdToken(async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          const token = await currentUser.getIdToken();
          setIdToken(token);
        } else {
          setUser(null);
          setIdToken(null);
        }
        setLoading(false);
      });
    } catch (err) {
      // Firebase env vars missing (NEXT_PUBLIC_FIREBASE_*). Show the signed-out state
      // so the user lands on sign-in with an explanation, instead of a crashed page.
      console.error(err);
      setLoading(false);
    }

    return () => unsubscribe?.();
  }, []);

  const handleSignOut = async () => {
    if (USE_MOCK_AUTH) {
      setUser(null);
      setIdToken(null);
      return;
    }
    const { signOutUser } = await import("./auth");
    await signOutUser();
  };

  const mockLogin = (name = "Dr. Soumya Jain", email = "researcher@lnmiit.ac.in") => {
    const updatedMockUser = {
      ...MOCK_USER,
      displayName: name,
      email,
    };
    setUser(updatedMockUser as User);
    setIdToken("mock_firebase_id_token_raghive_bearer_12345");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        idToken,
        signOut: handleSignOut,
        mockLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
