export type WatchlistEntry = {
  ticker: string;
  addedAt: number;
};

const STORAGE_KEY = "stockstory_watchlist_v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normaliseTicker(ticker: string): string {
  return ticker.toUpperCase().trim();
}

function readEntries(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeParse<WatchlistEntry[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed
    .filter((e) => typeof e?.ticker === "string" && typeof e?.addedAt === "number")
    .map((e) => ({ ticker: normaliseTicker(e.ticker), addedAt: e.addedAt }));
}

function writeEntries(entries: WatchlistEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getWatchlist(): WatchlistEntry[] {
  const entries = readEntries();
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

export function getWatchlistTickers(): string[] {
  return getWatchlist().map((e) => e.ticker);
}

export function isTickerInWatchlist(ticker: string): boolean {
  const t = normaliseTicker(ticker);
  return getWatchlistTickers().includes(t);
}

export function addTickerToWatchlist(ticker: string): void {
  const t = normaliseTicker(ticker);
  if (!t) return;

  const entries = readEntries();
  const exists = entries.some((e) => e.ticker === t);
  if (exists) return;

  const next = [{ ticker: t, addedAt: Date.now() }, ...entries];
  writeEntries(next);
}

export function removeTickerFromWatchlist(ticker: string): void {
  const t = normaliseTicker(ticker);
  if (!t) return;

  const entries = readEntries();
  const next = entries.filter((e) => e.ticker !== t);
  writeEntries(next);
}

export function clearWatchlist(): void {
  writeEntries([]);
}
