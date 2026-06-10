import type { AppEnv } from "../../config/env";

export type CacheGetResult<T> = { hit: true; value: T; fresh: boolean } | { hit: false };

type CacheEntry = {
  // JSON-serializable only (we keep it simple until DB-backed cache is introduced)
  value: unknown;
  expiresAtMs: number;
  staleUntilMs: number;
};

export type CacheSWR<T> = {
  /**
   * Hard expiration (fresh window). When now > expiresAtMs, entry becomes stale.
   */
  ttlMs: number;

  /**
   * Stale-while-revalidate window. When expiresAtMs < now <= staleUntilMs,
   * we return stale value and revalidate asynchronously.
   */
  staleTtlMs: number;
};

export class CacheHierarchyEngine {
  private env: AppEnv;
  private memory: Map<string, CacheEntry> = new Map();

  // Redis skeleton fields (optional)
  // We intentionally keep redis wiring out until integration begins.
  // Later: add per-domain cache namespaces + invalidation strategies.
   
  private redisEnabled: boolean;

  constructor(args: { env: AppEnv }) {
    this.env = args.env;
    this.redisEnabled = false;
  }

  getMemory(key: string): CacheEntry | undefined {
    return this.memory.get(key);
  }

  /**
   * Returns from cache if present.
   * If entry is expired-but-stale, we still return it as stale (fresh=false).
   */
  get<T>(key: string): CacheGetResult<T> {
    const entry = this.memory.get(key);
    if (!entry) return { hit: false };

    const now = Date.now();
    if (now > entry.staleUntilMs) {
      this.memory.delete(key);
      return { hit: false };
    }

    const fresh = now <= entry.expiresAtMs;
    return { hit: true, value: entry.value as T, fresh };
  }

  set<T>(key: string, value: T, swr: CacheSWR<T>): void {
    const now = Date.now();
    const expiresAtMs = now + swr.ttlMs;
    const staleUntilMs = expiresAtMs + swr.staleTtlMs;

    this.memory.set(key, { value, expiresAtMs, staleUntilMs });
  }

  delete(key: string): void {
    this.memory.delete(key);
  }

  /**
   * getOrFetchSWR
   * - fresh => return
   * - stale => return stale, kick off revalidate (best-effort)
   * - miss => block until fetched
   */
  async getOrFetchSWR<T>(key: string, swr: CacheSWR<T>, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached.hit) {
      if (cached.fresh) return cached.value;

      // stale: return immediately, revalidate async
      void (async () => {
        try {
          const next = await fetcher();
          this.set(key, next, swr);
        } catch {
          // never fail request due to cache revalidation
        }
      })();

      return cached.value;
    }

    const next = await fetcher();
    this.set(key, next, swr);
    return next;
  }

  stats(): { entries: number; configured: boolean } {
    return {
      entries: this.memory.size,
      configured: true,
    };
  }
}
