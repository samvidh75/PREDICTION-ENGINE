import type { StockPageSnapshot } from "../../shared/research/StockPageSnapshotTypes";

const STORAGE_KEY_PREFIX = "ss_snapshot_";
const CACHE_TTL = 5 * 60 * 1000;

function storageKey(symbol: string): string {
  return STORAGE_KEY_PREFIX + symbol.toUpperCase().trim();
}

export function getCachedSnapshot(symbol: string): StockPageSnapshot | null {
  try {
    const raw = sessionStorage.getItem(storageKey(symbol));
    if (!raw) return null;
    const entry = JSON.parse(raw) as { snapshot: StockPageSnapshot; ts: number };
    if (Date.now() - entry.ts > CACHE_TTL) {
      sessionStorage.removeItem(storageKey(symbol));
      return null;
    }
    return entry.snapshot;
  } catch {
    return null;
  }
}

export function getStaleSnapshot(symbol: string): StockPageSnapshot | null {
  try {
    const raw = sessionStorage.getItem(storageKey(symbol));
    if (!raw) return null;
    const entry = JSON.parse(raw) as { snapshot: StockPageSnapshot; ts: number };
    return entry.snapshot;
  } catch {
    return null;
  }
}

export function setCachedSnapshot(symbol: string, snapshot: StockPageSnapshot): void {
  try {
    sessionStorage.setItem(storageKey(symbol), JSON.stringify({ snapshot, ts: Date.now() }));
  } catch {/* silent */}
}

export function clearCachedSnapshot(symbol: string): void {
  try {
    sessionStorage.removeItem(storageKey(symbol));
  } catch {/* silent */}
}
