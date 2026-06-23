import type { StockPageSnapshot } from "../../../shared/research/StockPageSnapshotTypes";

interface CacheEntry {
  snapshot: StockPageSnapshot;
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 120_000;

export function getCachedSnapshot(symbol: string): StockPageSnapshot | null {
  const entry = cache.get(symbol.toUpperCase().trim());
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    cache.delete(symbol.toUpperCase().trim());
    return null;
  }
  return entry.snapshot;
}

export function setCachedSnapshot(symbol: string, snapshot: StockPageSnapshot): void {
  cache.set(symbol.toUpperCase().trim(), { snapshot, ts: Date.now() });
}

export function invalidateCachedSnapshot(symbol: string): void {
  cache.delete(symbol.toUpperCase().trim());
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
