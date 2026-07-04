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
import { authService, type AuthUser } from "../services/auth/authService";
import { browserLLM } from "../services/ai/BrowserLLM";

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const unsub = authService.subscribeSession((authUser) => {
        setUser(authUser);
        setLoading(false);

        // Trigger LLM model loading in background when user logs in (40-50s window)
        if (authUser && !browserLLM.isReady()) {
          console.log("[AuthProvider] Starting LLM model download...");
          browserLLM.loadModel().then((success) => {
            if (success) {
              console.log("[AuthProvider] LLM model loaded successfully");
            } else {
              console.warn("[AuthProvider] LLM model load failed, will use server fallback");
            }
          });
        }
      });
      return unsub;
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
