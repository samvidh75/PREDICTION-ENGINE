import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getRedirectResult, onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { firebaseAuth, firebasePersistenceReady } from "../config/firebase";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "../services/auth/sessionStore";

export interface AuthContextType {
  user: Pick<User, "uid" | "email" | "displayName"> | null;
  loading: boolean;
  isAuthenticated: boolean;
  isConnecting: boolean;
  sessionNode: string | null;
  authError: string | null;
  initializeSession: () => Promise<void>;
  logout: () => Promise<void>;
  encryptionToken: string;
  encryptionChannelToken: string;
  simulateTimeout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  isConnecting: false,
  sessionNode: null,
  authError: null,
  encryptionToken: "256-BIT",
  encryptionChannelToken: "256-BIT",
  initializeSession: async () => {},
  logout: async () => {},
  simulateTimeout: () => {},
});

function providerForUser(user: Pick<User, "providerData">): "google" | "email" {
  return user.providerData.some((provider) => provider.providerId.includes("google")) ? "google" : "email";
}

function persistFirebaseUser(user: User): void {
  saveAuthSession({
    status: "authenticated",
    uid: user.uid,
    provider: providerForUser(user),
    email: user.email ?? undefined,
    displayName: user.displayName ?? undefined,
    createdAtMs: Date.now(),
  });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Pick<User, "uid" | "email" | "displayName"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;

    const restoreStoredSession = () => {
      const stored = loadAuthSession();
      if (stored.status !== "authenticated" || !stored.uid) return false;
      setUser({
        uid: stored.uid,
        email: stored.email ?? null,
        displayName: stored.displayName ?? null,
      });
      setLoading(false);
      return true;
    };

    void firebasePersistenceReady
      .then(() => {
        if (!alive) return;
        void getRedirectResult(firebaseAuth)
          .then((result) => {
            if (!alive || !result?.user) return;
            setUser(result.user);
            persistFirebaseUser(result.user);
            setAuthError(null);
            setLoading(false);
            window.dispatchEvent(new Event("ss:auth-session-changed"));
          })
          .catch((error) => {
            console.error("[AuthContext] Google redirect completion failed:", error);
            if (alive) {
              setAuthError(error instanceof Error ? error.message : "Google sign-in could not be completed.");
            }
          });
        unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
          if (!alive) return;

          setAuthError(null);
          setUser(firebaseUser);

          if (firebaseUser) {
            persistFirebaseUser(firebaseUser);
          } else {
            if (!restoreStoredSession()) clearAuthSession();
          }

          setLoading(false);
        });
      })
      .catch((error) => {
        if (!alive) return;
        console.error("[AuthContext] Persistence setup failed:", error);
        setAuthError(error instanceof Error ? error.message : "Authentication persistence could not be initialized.");
        setUser(null);
        clearAuthSession();
        setLoading(false);
      });

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const syncStoredSession = () => {
      const stored = loadAuthSession();
      if (stored.status === "authenticated" && stored.uid) {
        setUser({
          uid: stored.uid,
          email: stored.email ?? null,
          displayName: stored.displayName ?? null,
        });
      } else if (!firebaseAuth.currentUser) {
        setUser(null);
      }
      setLoading(false);
    };

    window.addEventListener("ss:auth-session-changed", syncStoredSession);
    window.addEventListener("storage", syncStoredSession);
    return () => {
      window.removeEventListener("ss:auth-session-changed", syncStoredSession);
      window.removeEventListener("storage", syncStoredSession);
    };
  }, []);

  const initializeSession = useCallback(async () => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      await firebasePersistenceReady;
      if (firebaseAuth.currentUser) {
        await firebaseAuth.currentUser.reload();
        persistFirebaseUser(firebaseAuth.currentUser);
        setUser(firebaseAuth.currentUser);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Session could not be initialized.";
      setAuthError(message);
      console.error("[AuthContext] Session initialization error:", error);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      await firebaseSignOut(firebaseAuth);
      clearAuthSession();
      window.dispatchEvent(new Event("ss:auth-session-changed"));
      setUser(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign out could not be completed.";
      setAuthError(message);
      console.error("[AuthContext] Logout error:", error);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isConnecting,
      sessionNode: user ? user.email ?? user.uid : null,
      authError,
      encryptionToken: "256-BIT",
      encryptionChannelToken: "256-BIT",
      initializeSession,
      logout,
      simulateTimeout: () => {},
    }),
    [authError, initializeSession, isConnecting, loading, logout, user],
  );

  // Show children only when auth state has been resolved.
  // The loading state is set to false once onAuthStateChanged fires.
  // After initial load, loading stays false even during logout transitions
  // because onAuthStateChanged sets firebaseUser=null and loading=false simultaneously.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
