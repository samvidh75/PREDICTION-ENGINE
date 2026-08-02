/**
 * TRACK-P0-MEGA — Watchlist Store (hardened)
 *
 * Local-first watchlist management with optional remote sync for signed-in users.
 * Remote sync uses Bearer token via authenticatedFetch. Never sends ?uid=.
 * Signed-out users work fully local. Remote sync failure never erases local cache.
 */
import { loadAuthSession } from "../auth/sessionStore";
import { authenticatedFetchOnlyIfSignedIn } from "../auth/authenticatedFetch";
import { AnalyticsCoordinator } from "../diagnostics/AnalyticsCoordinator";

export interface CustomWatchlist {
  id: string;
  name: string;
  tickers: string[];
  isArchived: boolean;
  isFavourite: boolean;
  order: number;
}

const STORAGE_KEY_PREFIX = "stockstory_multi_watchlist_v1";
const WATCHLIST_EVENT_NAME = "watchlistchange";

function dispatchWatchlistChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WATCHLIST_EVENT_NAME));
}

export function subscribeWatchlist(fn: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  window.addEventListener(WATCHLIST_EVENT_NAME, fn);
  return () => {
    window.removeEventListener(WATCHLIST_EVENT_NAME, fn);
  };
}

function resolveStorageKey(uid?: string): string {
  const u = (uid && uid.trim().length > 0 ? uid.trim() : loadAuthSession().uid) ?? "anonymous";
  return `${STORAGE_KEY_PREFIX}_${u}`;
}

const DEFAULT_WATCHLISTS: CustomWatchlist[] = [];

let isInitialSyncStarted = false;

/**
 * Sync watchlists from remote (Bearer token, no ?uid=).
 * On failure, do NOT erase local cache.
 */
export function syncWatchlistsWithBackend() {
  if (typeof window === "undefined") return;

  authenticatedFetchOnlyIfSignedIn("/api/watchlists")
    .then(async (response) => {
      if (!response || !response.ok) return; // signed out or fetch failed — keep local
      const lists: CustomWatchlist[] = await response.json();
      if (Array.isArray(lists) && lists.length > 0) {
        const activeUid = loadAuthSession().uid || "anonymous";
        const key = resolveStorageKey(activeUid);
        window.localStorage.setItem(key, JSON.stringify(lists));
        dispatchWatchlistChange();
      }
    })
    .catch(() => {
      // Remote failure — local cache is preserved
    });
}

export function getWatchlists(uid?: string): CustomWatchlist[] {
  if (typeof window === "undefined") return DEFAULT_WATCHLISTS;

  if (!isInitialSyncStarted) {
    isInitialSyncStarted = true;
    syncWatchlistsWithBackend();
  }

  const key = resolveStorageKey(uid);
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    window.localStorage.setItem(key, JSON.stringify(DEFAULT_WATCHLISTS));
    return DEFAULT_WATCHLISTS;
  }
  try {
    const parsed = JSON.parse(raw) as CustomWatchlist[];
    return parsed.filter(w => !w.isArchived).sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_WATCHLISTS;
  }
}

export function saveWatchlists(lists: CustomWatchlist[], uid?: string): void {
  if (typeof window === "undefined") return;
  const key = resolveStorageKey(uid);
  window.localStorage.setItem(key, JSON.stringify(lists));
  dispatchWatchlistChange();

  // Async sync to backend with Bearer token (no ?uid=)
  const activeUid = uid || loadAuthSession().uid || "anonymous";
  authenticatedFetchOnlyIfSignedIn(`/api/investor-state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ watchlists: lists }),
  }).catch(() => {
    // Remote failure — local cache preserved
  });
}

export function createWatchlist(name: string, uid?: string): CustomWatchlist {
  const lists = getWatchlists(uid);
  const next: CustomWatchlist = {
    id: (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296).toString(36).substring(2, 9),
    name,
    tickers: [],
    isArchived: false,
    isFavourite: false,
    order: lists.length,
  };
  lists.push(next);
  saveWatchlists(lists, uid);
  return next;
}

export function renameWatchlist(id: string, name: string, uid?: string): void {
  const lists = getWatchlists(uid);
  const found = lists.find(w => w.id === id);
  if (found) {
    found.name = name;
    saveWatchlists(lists, uid);
  }
}

export function archiveWatchlist(id: string, uid?: string): void {
  const lists = getWatchlists(uid);
  const found = lists.find(w => w.id === id);
  if (found) {
    found.isArchived = true;
    saveWatchlists(lists, uid);
  }
}

export function toggleFavourite(id: string, uid?: string): void {
  const lists = getWatchlists(uid);
  const found = lists.find(w => w.id === id);
  if (found) {
    found.isFavourite = !found.isFavourite;
    saveWatchlists(lists, uid);
  }
}

export function addTickerToWatchlist(listId: string, ticker: string, uid?: string): void {
  const lists = getWatchlists(uid);
  const found = lists.find(w => w.id === idOrFallback(listId, lists));
  const sym = ticker.toUpperCase().trim();
  if (found && !found.tickers.includes(sym)) {
    found.tickers.push(sym);
    saveWatchlists(lists, uid);
  }
}

export function removeTickerFromWatchlist(listId: string, ticker: string, uid?: string): void {
  const lists = getWatchlists(uid);
  const found = lists.find(w => w.id === idOrFallback(listId, lists));
  const sym = ticker.toUpperCase().trim();
  if (found) {
    found.tickers = found.tickers.filter(t => t !== sym);
    saveWatchlists(lists, uid);
  }
}

export function deleteWatchlist(id: string, uid?: string): void {
  const lists = getWatchlists(uid);
  const filtered = lists.filter(w => w.id !== id);
  saveWatchlists(filtered, uid);
}

export function updateWatchlistOrder(orderedIds: string[], uid?: string): void {
  const lists = getWatchlists(uid);
  lists.forEach(w => {
    const idx = orderedIds.indexOf(w.id);
    if (idx !== -1) {
      w.order = idx;
    }
  });
  saveWatchlists(lists, uid);
}

function idOrFallback(id: string, lists: CustomWatchlist[]): string {
  if (lists.some(l => l.id === id)) return id;
  return lists[0]?.id || id;
}

// Retro-compatibility legacy wrappers
export type WatchlistEntry = {
  ticker: string;
  addedAt: number;
};

export function getWatchlist(uid?: string): WatchlistEntry[] {
  const list = getWatchlists(uid)[0];
  if (!list) return [];
  return list.tickers.map(t => ({ ticker: t, addedAt: Date.now() }));
}

export function getWatchlistTickers(uid?: string): string[] {
  const list = getWatchlists(uid)[0];
  return list ? list.tickers : [];
}

export function isTickerInWatchlist(ticker: string, uid?: string): boolean {
  const sym = ticker.toUpperCase().trim();
  return getWatchlists(uid).some(w => w.tickers.includes(sym));
}
