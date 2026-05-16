import { useEffect, useMemo, useState } from "react";
import { authService, type AuthUser } from "../../services/auth/authService";

export type AuthHydrationStatus = "loading" | "authenticated" | "anonymous";

export type AuthSession = {
  status: AuthHydrationStatus;
  user: AuthUser | null;
  error: string | null;
};

export default function useAuthSession(): AuthSession {
  const [status, setStatus] = useState<AuthHydrationStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

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
        const msg = typeof e === "object" && e && "message" in e && typeof (e as { message?: unknown }).message === "string"
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
