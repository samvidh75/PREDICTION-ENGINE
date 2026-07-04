/**
 * context/AuthContext — React context for Firebase auth state.
 *
 * Wraps authService.subscribeSession into a React context so any component
 * can consume the current authenticated user via useAuth().
 *
 * Usage:
 *   // Wrap app root:
 *   <AuthProvider>
 *     <App />
 *   </AuthProvider>
 *
 *   // In any child component:
 *   const { user, loading } = useAuth();
 *   if (loading) return <Spinner />;
 *   if (!user) return <LoginPage />;
 *   return <Dashboard user={user} />;
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "../services/auth/authService";
import { loadAuthSession } from "../services/auth/sessionStore";

// ── Context shape ──────────────────────────────────────────────────────────

interface AuthContextValue {
  /** The current Firebase user, or null if not authenticated. */
  user: AuthUser | null;
  /** True while the initial auth state is being resolved. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
});

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialSession = loadAuthSession();
  const [user, setUser] = useState<AuthUser | null>(
    initialSession.status === "authenticated"
      ? {
          uid: initialSession.uid ?? "",
          email: initialSession.email,
          displayName: initialSession.displayName,
          provider: initialSession.provider ?? "email",
          isNewUser: false,
        }
      : null,
  );
  const [loading, setLoading] = useState(initialSession.status === "authenticated");

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    const runWhenIdle = (task: () => void, timeout = 3000) => {
      if (typeof window === "undefined") return;
      if ("requestIdleCallback" in window) {
        const id = window.requestIdleCallback(task, { timeout });
        return () => window.cancelIdleCallback(id);
      }
      const id = globalThis.setTimeout(task, timeout);
      return () => globalThis.clearTimeout(id);
    };

    try {
      const cancelAuthBoot = runWhenIdle(() => {
        void import("../services/auth/authService")
          .then(({ authService }) => {
            if (cancelled) return;

            unsub = authService.subscribeSession((authUser) => {
              setUser(authUser);
              setLoading(false);

              if (!authUser) return;

              void import("../services/ai/BrowserLLM").then(({ browserLLM }) => {
                if (cancelled || browserLLM.isReady()) return;
                console.log("[AuthProvider] Starting LLM model download...");
                void browserLLM.loadModel().then((success) => {
                  if (success) {
                    console.log("[AuthProvider] LLM model loaded successfully");
                  } else {
                    console.warn("[AuthProvider] LLM model load failed, will use server fallback");
                  }
                });
              });
            });
          })
          .catch((err: unknown) => {
            const msg =
              err && typeof err === "object" && "message" in err
                ? (err as { message: string }).message
                : "Firebase auth unavailable";
            console.warn("[AuthProvider] Failed to bootstrap auth session:", msg);
            setLoading(false);
          });
      }, 2500);

      return () => {
        cancelled = true;
        cancelAuthBoot?.();
        unsub?.();
      };
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Firebase auth unavailable";
      console.warn("[AuthProvider] Failed to subscribe to auth session:", msg);
      setLoading(false);
      return undefined;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}

export default AuthProvider;
