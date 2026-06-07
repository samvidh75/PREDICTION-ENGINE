export type PremiumTier = "free" | "premium" | "institutional";

export type MonetisationEventType =
  | "premium_tier_set"
  | "premium_tier_clear"
  | "premium_unlock_prompt_viewed"
  | "premium_unlock_cta_clicked"
  | "premium_feature_rendered"
  | "premium_feature_denied";

export type MonetisationContext = {
  page?: string;
  featureKey?: string;
  requiredTier?: PremiumTier;
  currentTier?: PremiumTier;
  reason?: string;
};

export type MonetisationEvent = {
  type: MonetisationEventType;
  ts: number;
  ctx?: MonetisationContext;
};

const STORAGE_KEY = "monetisation_events_v1";
const MAX_EVENTS = 250;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function emitMonetisationEvent(event: MonetisationEvent): void {
  if (!canUseStorage()) {
    // Server-side / tests: never fail the app.
    return;
  }

  try {
    const existing = safeParseJson(window.localStorage.getItem(STORAGE_KEY));

    const arr: MonetisationEvent[] = Array.isArray(existing) ? (existing as MonetisationEvent[]) : [];

    arr.push(event);

    // Keep bounded buffer.
    const next = arr.length > MAX_EVENTS ? arr.slice(arr.length - MAX_EVENTS) : arr;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }

  // Non-invasive runtime visibility for dev QA.
  // eslint-disable-next-line no-console
  if (import.meta.env?.DEV) console.debug("[monetisation]", event);
}

export function readMonetisationEvents(): MonetisationEvent[] {
  if (!canUseStorage()) return [];
  const existing = safeParseJson(window.localStorage.getItem(STORAGE_KEY));
  return Array.isArray(existing) ? (existing as MonetisationEvent[]) : [];
}

export function clearMonetisationEvents(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
