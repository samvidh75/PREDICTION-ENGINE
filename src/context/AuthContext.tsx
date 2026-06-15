import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getRedirectResult, onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { firebaseAuth, firebasePersistenceReady, isFirebaseClientConfigured } from "../config/firebase";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "../services/auth/sessionStore";
import {
  logAuthState,
  getSessionAgeMs,
  recordSessionStart,
  clearSessionStart,
} from "../services/auth/AuthStateLogger";

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
  isSessionExpired: boolean;
  sessionAgeMs: number | null;
  /** True when auth loading is artificially delayed for testing */
  isSimulatingTimeout: boolean;
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
  isSessionExpired: false,
  sessionAgeMs: null,
  isSimulatingTimeout: false,
});

function providerForUser(user: Pick<User, "providerData">): "google" | "email" {
  return user.providerData.some((provider) => provider.providerId.includes("google")) ? "google" : "email";
}

function persistFirebaseUser(user: User): void {
  recordSessionStart();
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
  const [isSimulatingTimeout, setIsSimulatingTimeout] = useState(false);

  // Track session age for expiry detection
  const [sessionAgeMs, setSessionAgeMs] = useState<number | null>(() => getSessionAgeMs());
  const isSessionExpired = useRef(false);
  const loadingStartMs = useRef(Date.now());
  const simTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Periodically refresh session age
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionAgeMs(getSessionAgeMs());
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Loading timeout diagnostic (30s)
  useEffect(() => {
    if (!loading) return;

    const timeoutId = setTimeout(() => {
      if (loading) {
        logAuthState({
          phase: "loading_timeout",
          elapsedMs: Date.now() - loadingStartMs.current,
        });
      }
    }, 30_000);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;

    if (!isFirebaseClientConfigured) {
      logAuthState({
        phase: "persistence_error",
        error: "Firebase auth is not configured for this deployment.",
      });
      setAuthError("Authentication is not configured for this deployment. Please contact support.");
      setUser(null);
      clearAuthSession();
      clearSessionStart();
      setLoading(false);
      setSessionAgeMs(null);
      return () => {
        alive = false;
      };
    }

    const restoreStoredSession = (): boolean => {
      const stored = loadAuthSession();
      if (stored.status !== "authenticated" || !stored.uid) {
        // Check if a previously valid session expired
        const age = getSessionAgeMs();
        if (age !== null && age > 7 * 24 * 60 * 60 * 1000) {
          isSessionExpired.current = true;
          logAuthState({
            phase: "session_expired",
            sessionAgeMs: age,
            uid: stored.uid ?? undefined,
          });
        }
        return false;
      }

      logAuthState({
        phase: "session_restored",
        uid: stored.uid,
        sessionAgeMs: getSessionAgeMs() ?? undefined,
      });

      setUser({
        uid: stored.uid,
        email: stored.email ?? null,
        displayName: stored.displayName ?? null,
      });
      setSessionAgeMs(getSessionAgeMs());
      return true;
    };

    void firebasePersistenceReady
      .then(() => {
        if (!alive) return;
        void getRedirectResult(firebaseAuth)
          .then((result) => {
            if (!alive || !result?.user) return;
            logAuthState({
              phase: "firebase_confirmed",
              uid: result.user.uid,
              provider: providerForUser(result.user),
            });
            setUser(result.user);
            persistFirebaseUser(result.user);
            setAuthError(null);
            setLoading(false);
            setSessionAgeMs(getSessionAgeMs());
            window.dispatchEvent(new Event("ss:auth-session-changed"));
          })
          .catch((error) => {
            if (!alive) return;
            const message = error instanceof Error ? error.message : "Google sign-in could not be completed.";
            logAuthState({ phase: "redirect_result_error", error: message });
            setAuthError(message);
            setLoading(false);
          });

        unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
          if (!alive) return;

          setAuthError(null);

          if (firebaseUser) {
            logAuthState({
              phase: "firebase_confirmed",
              uid: firebaseUser.uid,
              provider: providerForUser(firebaseUser),
            });
            setUser(firebaseUser);
            persistFirebaseUser(firebaseUser);
          } else {
            logAuthState({ phase: "firebase_null" });
            if (!restoreStoredSession()) {
              clearAuthSession();
              clearSessionStart();
              setUser(null);
              setSessionAgeMs(null);
            }
          }

          setLoading(false);
        });
      })
      .catch((error) => {
        if (!alive) return;
        const message = error instanceof Error ? error.message : "Authentication persistence could not be initialized.";
        logAuthState({ phase: "persistence_error", error: message });
        setAuthError(message);
        setUser(null);
        clearAuthSession();
        clearSessionStart();
        setLoading(false);
        setSessionAgeMs(null);
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
        setSessionAgeMs(getSessionAgeMs());
      } else if (!isFirebaseClientConfigured || !firebaseAuth.currentUser) {
        setUser(null);
        setSessionAgeMs(null);
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
      if (!isFirebaseClientConfigured) {
        setAuthError("Authentication is not configured for this deployment. Please contact support.");
        return;
      }
      await firebasePersistenceReady;
      if (firebaseAuth.currentUser) {
        await firebaseAuth.currentUser.reload();
        persistFirebaseUser(firebaseAuth.currentUser);
        setUser(firebaseAuth.currentUser);
        setSessionAgeMs(getSessionAgeMs());
        logAuthState({
          phase: "firebase_confirmed",
          uid: firebaseAuth.currentUser.uid,
          provider: providerForUser(firebaseAuth.currentUser),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Session could not be initialized.";
      logAuthState({ phase: "persistence_error", error: message });
      setAuthError(message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      if (isFirebaseClientConfigured) {
        await firebaseSignOut(firebaseAuth);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign out could not be completed.";
      logAuthState({ phase: "persistence_error", error: message });
      setAuthError(message);
    } finally {
      clearAuthSession();
      clearSessionStart();
      setUser(null);
      setSessionAgeMs(null);
      isSessionExpired.current = false;
      setIsConnecting(false);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("page", "login");
        window.history.replaceState({}, "", url.toString());
        window.dispatchEvent(new Event("urlchange"));
        window.dispatchEvent(new Event("ss:auth-session-changed"));
      }
    }
  }, []);

  /**
   * simulateTimeout — Artificially extend the loading state for testing.
   *
   * Calling this sets `isSimulatingTimeout=true` and extends `loading`
   * by clearing the Firebase auth listener and holding the state open
   * until the timeout is manually resolved (page refresh or timeout hit).
   *
   * This is for testing the AuthUXLoader's slow/timeout UI in dev.
   */
  const simulateTimeout = useCallback(() => {
    if (simTimeoutRef.current) {
      clearTimeout(simTimeoutRef.current);
    }
    setIsSimulatingTimeout(true);
    setLoading(true);

    // Hold loading state artificially for 45s (crosses both slow + timeout thresholds)
    simTimeoutRef.current = setTimeout(() => {
      setIsSimulatingTimeout(false);
      setLoading(false);
      simTimeoutRef.current = null;
    }, 45_000);
  }, []);

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (simTimeoutRef.current) {
        clearTimeout(simTimeoutRef.current);
      }
    };
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
      simulateTimeout,
      isSessionExpired: isSessionExpired.current,
      sessionAgeMs,
      isSimulatingTimeout,
    }),
    [user, loading, isConnecting, authError, initializeSession, logout, simulateTimeout, sessionAgeMs, isSimulatingTimeout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
