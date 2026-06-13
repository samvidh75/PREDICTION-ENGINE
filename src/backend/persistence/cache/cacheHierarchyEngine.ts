import type { AppEnv } from "../../config/env";

export type CacheGetResult<T> = { hit: true; value: T; fresh: boolean } | { hit: false };
type CacheDomain = "provider" | "backend" | "default";

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
  private missInFlight: Map<string, Promise<unknown>> = new Map();
  private staleRevalidateInFlight: Map<string, Promise<void>> = new Map();
  private negativeCache: Map<string, number> = new Map();
  private redisEnabled: boolean;
  private redisClient: unknown | null = null;
  private redisConnectPromise: Promise<unknown | null> | null = null;

  constructor(args: { env: AppEnv }) {
    this.env = args.env;
    this.redisEnabled = Boolean(process.env.REDIS_URL);
  }

  getMemory(key: string): CacheEntry | undefined {
    return this.memory.get(key);
  }

  /**
   * Returns from cache if present.
   * If entry is expired-but-stale, we still return it as stale (fresh=false).
   */
  get<T>(key: string): CacheGetResult<T> {
    const namespacedKey = this.namespaceKey(key);
    const entry = this.memory.get(namespacedKey);
    if (!entry) return { hit: false };

    const now = Date.now();
    if (now > entry.staleUntilMs) {
      this.memory.delete(namespacedKey);
      return { hit: false };
    }

    const fresh = now <= entry.expiresAtMs;
    return { hit: true, value: entry.value as T, fresh };
  }

  set<T>(key: string, value: T, swr: CacheSWR<T>): void {
    const namespacedKey = this.namespaceKey(key);
    const now = Date.now();
    const expiresAtMs = now + swr.ttlMs;
    const staleUntilMs = expiresAtMs + swr.staleTtlMs;

    this.memory.set(namespacedKey, { value, expiresAtMs, staleUntilMs });
  }

  delete(key: string): void {
    const namespacedKey = this.namespaceKey(key);
    this.memory.delete(namespacedKey);
    this.negativeCache.delete(namespacedKey);
  }

  /**
   * getOrFetchSWR
   * - fresh => return
   * - stale => return stale, kick off revalidate (best-effort)
   * - miss => block until fetched
   */
  async getOrFetchSWR<T>(key: string, swr: CacheSWR<T>, fetcher: () => Promise<T>, options?: { domain?: CacheDomain; negativeTtlMs?: number }): Promise<T> {
    const namespacedKey = this.namespaceKey(key, options?.domain);
    if (this.isNegativelyCached(namespacedKey)) {
      throw new Error("Cache negative entry is still active");
    }

    const cached = await this.getAsync<T>(namespacedKey);
    if (cached.hit) {
      if (cached.fresh) return cached.value;

      this.revalidateStale(namespacedKey, swr, fetcher, options?.negativeTtlMs);

      return cached.value;
    }

    const existing = this.missInFlight.get(namespacedKey);
    if (existing) return existing as Promise<T>;

    const promise = (async () => {
      try {
        const next = await fetcher();
        await this.setAsync(namespacedKey, next, swr);
        return next;
      } catch (error) {
        this.setNegative(namespacedKey, options?.negativeTtlMs ?? 30_000);
        throw error;
      } finally {
        this.missInFlight.delete(namespacedKey);
      }
    })();

    this.missInFlight.set(namespacedKey, promise);
    return promise;
  }

  stats(): { entries: number; configured: boolean; redisEnabled: boolean; missInFlight: number; staleRevalidationsInFlight: number; negativeEntries: number } {
    return {
      entries: this.memory.size,
      configured: true,
      redisEnabled: this.redisEnabled,
      missInFlight: this.missInFlight.size,
      staleRevalidationsInFlight: this.staleRevalidateInFlight.size,
      negativeEntries: this.negativeCache.size,
    };
  }

  resetForTests(): void {
    this.memory.clear();
    this.missInFlight.clear();
    this.staleRevalidateInFlight.clear();
    this.negativeCache.clear();
  }

  private revalidateStale<T>(key: string, swr: CacheSWR<T>, fetcher: () => Promise<T>, negativeTtlMs?: number): void {
    if (this.staleRevalidateInFlight.has(key)) return;

    const promise = (async () => {
      try {
        const next = await fetcher();
        await this.setAsync(key, next, swr);
      } catch {
        this.setNegative(key, negativeTtlMs ?? 30_000);
      } finally {
        this.staleRevalidateInFlight.delete(key);
      }
    })();

    this.staleRevalidateInFlight.set(key, promise);
  }

  private async getAsync<T>(namespacedKey: string): Promise<CacheGetResult<T>> {
    const local = this.get<T>(namespacedKey);
    if (local.hit) return local;

    const redis = await this.getRedisClient();
    if (!redis) return { hit: false };

    const raw = await redis.get(namespacedKey);
    if (!raw) return { hit: false };

    try {
      const entry = JSON.parse(raw) as CacheEntry;
      this.memory.set(namespacedKey, entry);
      return this.get<T>(namespacedKey);
    } catch {
      await redis.del(namespacedKey);
      return { hit: false };
    }
  }

  private async setAsync<T>(namespacedKey: string, value: T, swr: CacheSWR<T>): Promise<void> {
    this.set(namespacedKey, value, swr);

    const redis = await this.getRedisClient();
    if (!redis) return;

    const entry = this.memory.get(namespacedKey);
    if (!entry) return;

    const ttlSeconds = Math.max(1, Math.ceil((entry.staleUntilMs - Date.now()) / 1_000));
    await redis.set(namespacedKey, JSON.stringify(entry), { EX: ttlSeconds });
  }

  private isNegativelyCached(namespacedKey: string): boolean {
    const expiresAt = this.negativeCache.get(namespacedKey);
    if (!expiresAt) return false;
    if (Date.now() < expiresAt) return true;
    this.negativeCache.delete(namespacedKey);
    return false;
  }

  private setNegative(namespacedKey: string, ttlMs: number): void {
    this.negativeCache.set(namespacedKey, Date.now() + Math.max(1, ttlMs));
  }

  private namespaceKey(key: string, domain: CacheDomain = "default"): string {
    if (key.startsWith("cache:")) return key;
    const safeDomain = domain.trim().toLowerCase() || "default";
    return `cache:${safeDomain}:${key}`;
  }

  private async getRedisClient(): Promise<any | null> {
    if (!this.redisEnabled) return null;
    if (this.redisClient) return this.redisClient as any;
    if (this.redisConnectPromise) return this.redisConnectPromise as Promise<any | null>;

    this.redisConnectPromise = (async () => {
      try {
        const { createClient } = await import("redis");
        const client = createClient({ url: process.env.REDIS_URL });
        client.on("error", () => {
          this.redisClient = null;
        });
        await client.connect();
        this.redisClient = client;
        return client;
      } catch {
        this.redisEnabled = false;
        return null;
      } finally {
        this.redisConnectPromise = null;
      }
    })();

    return this.redisConnectPromise;
  }
}
