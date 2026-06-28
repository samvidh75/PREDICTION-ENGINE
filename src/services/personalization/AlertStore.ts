/**
 * AlertStore — localStorage-first alert persistence with deduplication
 *
 * Stores AlertChangeView entries per user. Follows the same localStorage-first
 * pattern as watchlistStore, researchProfileStore, and ThesisHistoryStore.
 * Deduplication: alerts with the same (symbol, type, title) within 24h are merged.
 */
import { loadAuthSession } from "../auth/sessionStore";
import { authenticatedFetchOnlyIfSignedIn } from "../auth/authenticatedFetch";
import type { AlertChangeView } from "../../research/contracts/productContracts.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AlertStoreItem {
  alert: AlertChangeView;
  /** Local-only counter for how many times this alert fired */
  occurrenceCount: number;
  /** When this alert was first seen */
  firstSeenAt: string;
}

export interface AlertStoreState {
  alerts: AlertStoreItem[];
  lastSyncAt: string | null;
}

// ── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = "stockstory_alerts_v1";
const ALERT_EVENT_NAME = "alertchange";
const MAX_ALERTS = 200;

/**
 * Listen for alert changes anywhere in the app.
 * Returns unsubscribe function.
 */
export function subscribeAlerts(fn: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(ALERT_EVENT_NAME, fn);
  return () => window.removeEventListener(ALERT_EVENT_NAME, fn);
}

function dispatchAlertChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ALERT_EVENT_NAME));
}

function resolveStorageKey(): string {
  const uid = loadAuthSession().uid ?? "anonymous";
  return `${STORAGE_KEY_PREFIX}_${uid}`;
}

function loadState(): AlertStoreState {
  if (typeof window === "undefined") return { alerts: [], lastSyncAt: null };
  try {
    const raw = localStorage.getItem(resolveStorageKey());
    return raw ? JSON.parse(raw) : { alerts: [], lastSyncAt: null };
  } catch {
    return { alerts: [], lastSyncAt: null };
  }
}

function saveState(state: AlertStoreState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(resolveStorageKey(), JSON.stringify(state));
  } catch {
    // localStorage full — silently skip
  }
}

// ── Deduplication ────────────────────────────────────────────────────────────

/**
 * Two alerts are considered duplicates if they share the same symbol AND type
 * AND were generated within the same 24-hour window.
 */
function isDuplicate(a: AlertChangeView, b: AlertStoreItem): boolean {
  if (a.symbol !== b.alert.symbol || a.type !== b.alert.type) return false;
  const aTime = new Date(a.timestamp).getTime();
  const bTime = new Date(b.alert.timestamp).getTime();
  return Math.abs(aTime - bTime) < 24 * 60 * 60 * 1000;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Ingest one or more alerts, deduplicating against existing store.
 * Returns the deduplicated (new) alerts that were actually stored.
 */
export function ingestAlerts(rawAlerts: AlertChangeView[]): AlertChangeView[] {
  if (rawAlerts.length === 0) return [];

  const state = loadState();
  const stored: AlertChangeView[] = [];

  for (const alert of rawAlerts) {
    const existingIdx = state.alerts.findIndex((item) => isDuplicate(alert, item));
    if (existingIdx >= 0) {
      // Merge: bump occurrence count, update timestamp but keep firstSeenAt
      state.alerts[existingIdx].occurrenceCount += 1;
      state.alerts[existingIdx].alert.timestamp = alert.timestamp;
      state.alerts[existingIdx].alert.body = alert.body; // latest body
    } else {
      state.alerts.push({
        alert: { ...alert },
        occurrenceCount: 1,
        firstSeenAt: alert.timestamp,
      });
      stored.push(alert);
    }
  }

  // Trim to max
  if (state.alerts.length > MAX_ALERTS) {
    state.alerts = state.alerts.slice(-MAX_ALERTS);
  }

  saveState(state);
  dispatchAlertChange();
  return stored;
}

/**
 * Get all stored alert items (most recent first).
 */
export function getAlerts(): AlertStoreItem[] {
  const state = loadState();
  return [...state.alerts].sort(
    (a, b) => new Date(b.alert.timestamp).getTime() - new Date(a.alert.timestamp).getTime()
  );
}

/**
 * Get only unacknowledged alerts.
 */
export function getUnacknowledgedAlerts(): AlertStoreItem[] {
  return getAlerts().filter((item) => !item.alert.acknowledged);
}

/**
 * Count of unacknowledged alerts (for notification badges).
 */
export function getUnacknowledgedCount(): number {
  return getUnacknowledgedAlerts().length;
}

/**
 * Acknowledge (mark as read) one alert by ID.
 */
export function acknowledgeAlert(alertId: string): void {
  const state = loadState();
  const item = state.alerts.find((a) => a.alert.id === alertId);
  if (item) {
    item.alert.acknowledged = true;
    saveState(state);
    dispatchAlertChange();
  }
}

/**
 * Acknowledge all alerts.
 */
export function acknowledgeAllAlerts(): void {
  const state = loadState();
  for (const item of state.alerts) {
    item.alert.acknowledged = true;
  }
  saveState(state);
  dispatchAlertChange();
}

/**
 * Remove a single alert by ID.
 */
export function removeAlert(alertId: string): void {
  const state = loadState();
  state.alerts = state.alerts.filter((a) => a.alert.id !== alertId);
  saveState(state);
  dispatchAlertChange();
}

/**
 * Clear all alerts.
 */
export function clearAllAlerts(): void {
  saveState({ alerts: [], lastSyncAt: null });
  dispatchAlertChange();
}

/**
 * Get alerts filtered by type (e.g., "thesis_change", "watchlist_review").
 */
export function getAlertsByType(type: string): AlertStoreItem[] {
  return getAlerts().filter((item) => item.alert.type === type);
}

/**
 * Get alerts for a specific ticker.
 */
export function getAlertsBySymbol(symbol: string): AlertStoreItem[] {
  return getAlerts().filter((item) => item.alert.symbol === symbol.toUpperCase());
}

/**
 * Sync alert state to remote (Bearer token).
 * Remote failure never erases local cache.
 */
export async function syncAlertsToRemote(): Promise<void> {
  const uid = loadAuthSession().uid;
  if (!uid) return;

  const state = loadState();
  try {
    await authenticatedFetchOnlyIfSignedIn("/api/alerts", {
      method: "PUT",
      body: JSON.stringify(state),
      headers: { "Content-Type": "application/json" },
    });
    state.lastSyncAt = new Date().toISOString();
    saveState(state);
  } catch {
    // Remote sync failure — local data preserved
  }
}

/**
 * Pull alerts from remote (fresher than local lastSyncAt).
 * Merges remote alerts into local store with deduplication.
 */
export async function pullAlertsFromRemote(): Promise<void> {
  const uid = loadAuthSession().uid;
  if (!uid) return;

  try {
    const resp = await authenticatedFetchOnlyIfSignedIn("/api/alerts");
    if (!resp) return;
    const remote: AlertStoreState = await resp.json();
    if (!remote?.alerts?.length) return;

    const local = loadState();
    const remoteIds = new Set(remote.alerts.map((a) => a.alert.id));
    const merged = [...local.alerts.filter((a) => !remoteIds.has(a.alert.id)), ...remote.alerts]
      .sort((a, b) => new Date(b.alert.timestamp).getTime() - new Date(a.alert.timestamp).getTime())
      .slice(0, MAX_ALERTS);

    saveState({ alerts: merged, lastSyncAt: new Date().toISOString() });
    dispatchAlertChange();
  } catch {
    // Remote fetch failure — local data preserved
  }
}

export type { AlertChangeView };
