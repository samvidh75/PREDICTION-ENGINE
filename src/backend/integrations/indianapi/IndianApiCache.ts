import type { LayerKind, FetchStatus } from "./IndianApiTypes";

interface CacheEntry<T> {
  data: T;
  status: FetchStatus;
  storedAt: number;
  ttlMs: number;
  staleTtlMs: number;
}

function isMarketHours(): boolean {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const day = ist.getUTCDay();
  const hour = ist.getUTCHours();
  const min = ist.getUTCMinutes();
  const totalMin = hour * 60 + min;
  if (day === 0 || day === 6) return false;
  return totalMin >= 555 && totalMin < 930;
}

function getLayerTtls(layer: LayerKind): { freshMs: number; staleMs: number } {
  if (layer === "price") {
    if (isMarketHours()) return { freshMs: 5_000, staleMs: 30_000 };
    return { freshMs: 60_000, staleMs: 300_000 };
  }
  if (layer === "historical") return { freshMs: 3_600_000, staleMs: 7_200_000 };
  if (layer === "profile") return { freshMs: 86_400_000, staleMs: 172_800_000 };
  if (layer === "fundamentals" || layer === "financials") return { freshMs: 86_400_000, staleMs: 259_200_000 };
  if (layer === "shareholding") return { freshMs: 86_400_000, staleMs: 259_200_000 };
  if (layer === "corporate_actions") return { freshMs: 86_400_000, staleMs: 259_200_000 };
  return { freshMs: 300_000, staleMs: 900_000 };
}

export class IndianApiCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): { data: T | null; status: FetchStatus } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.storedAt;
    if (age < entry.ttlMs) return { data: entry.data as T, status: "cached" };
    if (age < entry.staleTtlMs) return { data: entry.data as T, status: "stale_cached" };
    this.store.delete(key);
    return null;
  }

  set<T>(key: string, data: T, layer: LayerKind): void {
    const { freshMs, staleMs } = getLayerTtls(layer);
    this.store.set(key, { data, status: "fresh", storedAt: Date.now(), ttlMs: freshMs, staleTtlMs: staleMs });
  }

  getLayerTtlSeconds(layer: LayerKind): number {
    return Math.round(getLayerTtls(layer).freshMs / 1000);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const globalIndianApiCache = new IndianApiCache();
