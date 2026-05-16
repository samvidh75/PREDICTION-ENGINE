import { loadAuthSession } from "../auth/sessionStore";

export type WatchlistEntry = {
  ticker: string;
  addedAt: number;
};

const STORAGE_KEY_BASE = "stockstory_watchlist_v1";

// Legacy (pre-uid) key for one-time migration.
const STORAGE_KEY_LEGACY = "stockstory_watchlist_v1";

function normaliseUid(uid: string): string {
  return uid.trim();
}

function normaliseTicker(ticker: string): string {
  return ticker.toUpperCase().trim();
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function resolveStorageKey(uid?: string): string {
  const u = (uid && uid.trim().length > 0 ? uid.trim() : loadAuthSession().uid) ?? "";
  if (!u) return STORAGE_KEY_BASE; // anonymous fallback (should rarely be used)
  return `${STORAGE_KEY_BASE}_${normaliseUid(u)}`;
}

function readEntries(storageKey: string): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey);
  const parsed = safeParse<WatchlistEntry[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed
    .filter((e) => typeof e?.ticker === "string" && typeof e?.addedAt === "number")
    .map((e) => ({ ticker: normaliseTicker(e.ticker), addedAt: e.addedAt }));
}

function writeEntries(storageKey: string, entries: WatchlistEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(entries));
}

function migrateLegacyIfNeeded(storageKey: string): void {
  // Only migrate if:
  // - storageKey is uid-scoped (not anonymous base key)
  // - user-scoped watchlist is empty
  // - legacy watchlist exists
  if (typeof window === "undefined") return;
  if (storageKey === STORAGE_KEY_BASE) return;

  const userEntries = readEntries(storageKey);
  if (userEntries.length > 0) return;

  const legacyEntries = readEntries(STORAGE_KEY_LEGACY);
  if (legacyEntries.length === 0) return;

  writeEntries(storageKey, legacyEntries);
}

function getStorageEntries(uid?: string): WatchlistEntry[] {
  const storageKey = resolveStorageKey(uid);
  migrateLegacyIfNeeded(storageKey);

  const entries = readEntries(storageKey);

  // de-dupe by ticker
  const seen = new Set<string>();
  const out: WatchlistEntry[] = [];
  for (const e of entries.sort((a, b) => b.addedAt - a.addedAt)) {
    if (seen.has(e.ticker)) continue;
    seen.add(e.ticker);
    out.push(e);
  }
  return out;
}

export function getWatchlist(uid?: string): WatchlistEntry[] {
  return getStorageEntries(uid);
}

export function getWatchlistTickers(uid?: string): string[] {
  return getWatchlist(uid).map((e) => e.ticker);
}

export function isTickerInWatchlist(ticker: string, uid?: string): boolean {
  const t = normaliseTicker(ticker);
  return getWatchlistTickers(uid).includes(t);
}

export function addTickerToWatchlist(ticker: string, uid?: string): void {
  const t = normaliseTicker(ticker);
  if (!t) return;

  const storageKey = resolveStorageKey(uid);
  migrateLegacyIfNeeded(storageKey);

  const entries = readEntries(storageKey);
  const exists = entries.some((e) => normaliseTicker(e.ticker) === t);
  if (exists) return;

  const next = [{ ticker: t, addedAt: Date.now() }, ...entries];
  writeEntries(storageKey, next);
}

export function removeTickerFromWatchlist(ticker: string, uid?: string): void {
  const t = normaliseTicker(ticker);
  if (!t) return;

  const storageKey = resolveStorageKey(uid);
  const entries = readEntries(storageKey);
  const next = entries.filter((e) => normaliseTicker(e.ticker) !== t);
  writeEntries(storageKey, next);
}

export function clearWatchlist(uid?: string): void {
  const storageKey = resolveStorageKey(uid);
  writeEntries(storageKey, []);
}
