export type AuthSessionStatus = "anonymous" | "authenticated";

export type AuthSession = {
  status: AuthSessionStatus;
  uid?: string;
  email?: string;
  displayName?: string;
  provider?: "google" | "email" | "apple";
  createdAtMs?: number;
};

const STORAGE_KEY = "ss_auth_session_v1";

export function loadAuthSession(): AuthSession {
  if (typeof window === "undefined") {
    return { status: "anonymous" };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { status: "anonymous" };

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed || parsed.status !== "authenticated") return { status: "anonymous" };

    return {
      status: "authenticated",
      uid: parsed.uid,
      email: parsed.email,
      displayName: parsed.displayName,
      provider: parsed.provider,
      createdAtMs: typeof parsed.createdAtMs === "number" ? parsed.createdAtMs : undefined,
    };
  } catch {
    return { status: "anonymous" };
  }
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore persistence failures; auth UI still functions in-memory
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
