import { useEffect, useMemo, useState } from "react";
import { authService, type AuthUser } from "../../services/auth/authService";

export type AuthHydrationStatus = "loading" | "authenticated" | "anonymous";

export type AuthSession = {
  status: AuthHydrationStatus;
  user: AuthUser | null;
  error: string | null;
};

function getDevQaAuthUser(): AuthUser | null {
  if (!import.meta.env?.DEV) return null;
  if (typeof window === "undefined") return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("qaAuth");
    if (raw === "1" || raw?.toLowerCase() === "true") {
      // Dev-only QA user: used to bypass auth-gated UI for local verification.
      return { uid: "qa_dev_user", provider: "email", email: "qa_dev@local.dev", displayName: "QA Dev" };
    }
    return null;
  } catch {
    return null;
  }
}

export default function useAuthSession(): AuthSession {
  const [status, setStatus] = useState<AuthHydrationStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const qaUser = getDevQaAuthUser();
    if (qaUser) {
      setStatus("authenticated");
      setUser(qaUser);
      setError(null);
      return () => {
        alive = false;
      };
    }

    setStatus("loading");
    setError(null);

    authService
      .restoreSession()
      .then((u) => {
        if (!alive) return;
        if (!u) {
          setUser(null);
          setStatus("anonymous");
          return;
        }
        setUser(u);
        setStatus("authenticated");
      })
      .catch((e) => {
        if (!alive) return;
        const msg =
          typeof e === "object" && e && "message" in e && typeof (e as { message?: unknown }).message === "string"
            ? (e as { message: string }).message
            : "Authentication could not be restored. Please try again.";
        setError(msg);
        setUser(null);
        setStatus("anonymous");
      });

    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => ({ status, user, error }), [status, user, error]);
}
