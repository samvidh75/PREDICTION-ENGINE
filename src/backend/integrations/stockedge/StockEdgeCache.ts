import type { StockEdgeLayer } from "./StockEdgeTypes";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleUntil: number;
}

export interface StockEdgeCacheRead<T> {
  value: T | null;
  state: "miss" | "fresh" | "stale";
}

export class StockEdgeMemoryCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly pending = new Map<string, Promise<unknown>>();

  key(layer: StockEdgeLayer, symbol = "UNIVERSE", suffix = "default"): string {
    return ["se", layer, symbol.toUpperCase(), suffix].join(":");
  }

  get<T>(key: string): StockEdgeCacheRead<T> {
    const entry = this.entries.get(key) as CacheEntry<T> | undefined;
    if (!entry) return { value: null, state: "miss" };
    const now = Date.now();
    if (entry.expiresAt >= now) return { value: entry.value, state: "fresh" };
    if (entry.staleUntil >= now) return { value: entry.value, state: "stale" };
    this.entries.delete(key);
    return { value: null, state: "miss" };
  }

  set<T>(key: string, value: T, ttlSeconds: number, staleSeconds = ttlSeconds * 6): void {
    const now = Date.now();
    this.entries.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
      staleUntil: now + (ttlSeconds + staleSeconds) * 1000,
    });
  }

  async coalesce<T>(key: string, producer: () => Promise<T>): Promise<T> {
    const current = this.pending.get(key) as Promise<T> | undefined;
    if (current) return current;
    const promise = producer().finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.entries.clear();
    this.pending.clear();
  }
}

export const stockEdgeMemoryCache = new StockEdgeMemoryCache();
