/**
 * ThesisHistoryStore — persists thesis snapshots over time per ticker
 *
 * Follows the same localStorage-first pattern as watchlistStore and researchProfileStore.
 * Each snapshot captures the thesis state at a point in time so users can see
 * "what changed since saved" and review thesis history.
 */
import { loadAuthSession } from "../auth/sessionStore";
import { authenticatedFetchOnlyIfSignedIn } from "../auth/authenticatedFetch";
import type { WatchlistThesisView } from "../../research/contracts/productContracts.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ThesisHistoryRecord {
  /** Composite key: {uid}__{symbol} */
  key: string;
  symbol: string;
  snapshots: ThesisSnapshot[];
}

export interface ThesisSnapshot {
  thesis: WatchlistThesisView;
  capturedAt: string;
}

// ── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = "stockstory_thesis_history_v1";
const THESIS_EVENT_NAME = "thesischange";

function dispatchThesisChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(THESIS_EVENT_NAME));
}

export function subscribeThesisHistory(fn: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(THESIS_EVENT_NAME, fn);
  return () => window.removeEventListener(THESIS_EVENT_NAME, fn);
}

function resolveStorageKey(): string {
  const uid = loadAuthSession().uid ?? "anonymous";
  return `${STORAGE_KEY_PREFIX}_${uid}`;
}

function loadAll(): Record<string, ThesisHistoryRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(resolveStorageKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, ThesisHistoryRecord>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(resolveStorageKey(), JSON.stringify(data));
  } catch {
    // localStorage full — silently skip
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Append a thesis snapshot for a ticker.
 * Keeps up to 20 snapshots per ticker (oldest trimmed).
 */
export function captureThesisSnapshot(thesis: WatchlistThesisView): void {
  const all = loadAll();
  const key = `${resolveStorageKey()}__${thesis.symbol}`;

  const entry = all[key] ?? { key, symbol: thesis.symbol, snapshots: [] };
  entry.snapshots.push({ thesis, capturedAt: new Date().toISOString() });

  // Trim to last 20 snapshots
  if (entry.snapshots.length > 20) {
    entry.snapshots = entry.snapshots.slice(-20);
  }

  all[key] = entry;
  saveAll(all);
  dispatchThesisChange();
}

/**
 * Get thesis history for a specific ticker.
 * Returns snapshots in chronological order (oldest first).
 */
export function getThesisHistory(symbol: string): ThesisSnapshot[] {
  const all = loadAll();
  const key = `${resolveStorageKey()}__${symbol}`;
  return all[key]?.snapshots ?? [];
}

/**
 * Get the most recent thesis snapshot for a ticker.
 */
export function getLatestThesis(symbol: string): ThesisSnapshot | null {
  const history = getThesisHistory(symbol);
  return history.length > 0 ? history[history.length - 1] : null;
}

/**
 * Get all symbols that have thesis history, with their latest snapshot.
 */
export function getAllThesisSymbols(): Array<{ symbol: string; latest: ThesisSnapshot }> {
  const all = loadAll();
  const prefix = `${resolveStorageKey()}__`;
  const results: Array<{ symbol: string; latest: ThesisSnapshot }> = [];

  for (const [key, record] of Object.entries(all)) {
    if (!key.startsWith(prefix)) continue;
    const snapshots = record.snapshots;
    if (snapshots.length > 0) {
      results.push({ symbol: record.symbol, latest: snapshots[snapshots.length - 1] });
    }
  }

  return results;
}

/**
 * Build a map of symbol → latest thesis for quick lookup.
 */
export function getLatestThesisMap(): Map<string, WatchlistThesisView> {
  const symbols = getAllThesisSymbols();
  const map = new Map<string, WatchlistThesisView>();
  for (const { symbol, latest } of symbols) {
    map.set(symbol, latest.thesis);
  }
  return map;
}

/**
 * Clear thesis history for a specific ticker.
 */
export function clearThesisHistory(symbol: string): void {
  const all = loadAll();
  const key = `${resolveStorageKey()}__${symbol}`;
  delete all[key];
  saveAll(all);
  dispatchThesisChange();
}

/**
 * Clear all thesis history.
 */
export function clearAllThesisHistory(): void {
  const all = loadAll();
  const prefix = `${resolveStorageKey()}__`;
  for (const key of Object.keys(all)) {
    if (key.startsWith(prefix)) delete all[key];
  }
  saveAll(all);
  dispatchThesisChange();
}

/**
 * Sync thesis history to remote (Bearer token, no ?uid=).
 * Remote failure never erases local cache.
 */
export async function syncThesisHistoryToRemote(): Promise<void> {
  const uid = loadAuthSession().uid;
  if (!uid) return;

  const all = loadAll();
  const prefix = `${resolveStorageKey()}__`;
  const payload: Record<string, ThesisHistoryRecord> = {};
  for (const [key, record] of Object.entries(all)) {
    if (key.startsWith(prefix)) payload[key] = record;
  }

  try {
    await authenticatedFetchOnlyIfSignedIn("/api/thesis-history", {
      method: "PUT",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Remote sync failure — local data preserved
  }
}

// ── Re-exports for convenience ───────────────────────────────────────────────
export type { WatchlistThesisView };
