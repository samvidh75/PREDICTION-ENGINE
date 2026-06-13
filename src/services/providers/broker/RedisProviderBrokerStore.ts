import type { CacheLookup, InFlightRegistration, ProviderBrokerStore, QuotaWindow } from './ProviderBrokerStore';
import type { BrokerResult, CacheState } from './types';

type RedisSetOptions = { EX?: number; NX?: boolean };

export interface ProviderBrokerRedisClient {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number | boolean>;
  ttl(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: RedisSetOptions): Promise<string | null>;
  del(key: string): Promise<number>;
}

type CacheEntry<T = unknown> = {
  data: T;
  expiresAt: number;
  staleAt: number;
  state: CacheState;
};

/**
 * Redis-backed broker store contract.
 *
 * Promise single-flight remains process-local because JavaScript promises cannot
 * be shared across replicas. Cross-replica coordination is exposed through
 * Redis TTL counters, cooldown keys, negative-cache keys, and distributed locks.
 */
export class RedisProviderBrokerStore implements ProviderBrokerStore {
  readonly redisUrl: string;
  private readonly client: ProviderBrokerRedisClient;
  private inFlight = new Map<string, { promise: Promise<any>; createdAt: number; consumerCount: number }>();
  private cache = new Map<string, CacheEntry>();
  private negativeCache = new Map<string, number>();

  constructor(redisUrl: string, client: ProviderBrokerRedisClient) {
    if (!redisUrl) {
      throw new Error('RedisProviderBrokerStore requires REDIS_URL.');
    }
    this.redisUrl = redisUrl;
    this.client = client;
  }

  getOrCreateInFlight<T>(key: string, factory: () => Promise<BrokerResult<T>>): InFlightRegistration<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      existing.consumerCount++;
      return { promise: existing.promise as Promise<BrokerResult<T>>, isLeader: false };
    }

    const promise = factory() as Promise<any>;
    this.inFlight.set(key, { promise, createdAt: Date.now(), consumerCount: 1 });
    promise.finally(() => {
      this.inFlight.delete(key);
    });
    return { promise, isLeader: true };
  }

  getInFlightConsumerCount(key: string): number {
    return this.inFlight.get(key)?.consumerCount ?? 0;
  }

  getFresh<T>(key: string): CacheLookup<T> | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() < entry.expiresAt) return { data: entry.data, staleAt: entry.staleAt };
    return null;
  }

  getStale<T>(key: string): CacheLookup<T> | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() < entry.staleAt) return { data: entry.data, staleAt: entry.staleAt };
    return null;
  }

  setFresh<T>(key: string, data: T, ttlMs: number, staleWindowMs: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      expiresAt: now + ttlMs,
      staleAt: now + ttlMs + staleWindowMs,
      state: 'fresh',
    });
  }

  isNegativelyCached(key: string): boolean {
    const expiresAt = this.negativeCache.get(key);
    if (!expiresAt) return false;
    if (Date.now() < expiresAt) return true;
    this.negativeCache.delete(key);
    return false;
  }

  setNegative(key: string, ttlMs: number): void {
    this.negativeCache.set(key, Date.now() + ttlMs);
    void this.setNegativeCache(key, ttlMs).catch(() => {
      // Local negative cache remains active if Redis is temporarily unavailable.
    });
  }

  key(namespace: 'quota' | 'cooldown' | 'cache' | 'negative' | 'lock' | 'run' | 'concurrency', ...parts: string[]): string {
    return `provider-broker:${namespace}:${parts.map(part => this.sanitizeKeyPart(part)).join(':')}`;
  }

  async getCooldown(provider: string): Promise<number | null> {
    const value = await this.optionalClient()?.get(this.key('cooldown', provider));
    if (!value) return null;
    const cooldownUntil = Number(value);
    return Number.isFinite(cooldownUntil) && cooldownUntil > Date.now() ? cooldownUntil : null;
  }

  async setCooldown(provider: string, retryAfterMs: number): Promise<void> {
    const ttlSeconds = this.msToSeconds(retryAfterMs);
    await this.requireClient().set(this.key('cooldown', provider), String(Date.now() + retryAfterMs), { EX: ttlSeconds });
  }

  async incrementQuotaCounter(provider: string, window: QuotaWindow, ttlSeconds: number): Promise<number> {
    const client = this.requireClient();
    const key = this.key('quota', provider, window);
    const count = await client.incr(key);
    await client.expire(key, ttlSeconds);
    return count;
  }

  async readQuotaCounter(provider: string, window: QuotaWindow): Promise<number> {
    const value = await this.optionalClient()?.get(this.key('quota', provider, window));
    return Number(value ?? 0);
  }

  async incrementRunBudget(runId: string, ttlSeconds: number): Promise<number> {
    const client = this.requireClient();
    const key = this.key('run', runId);
    const count = await client.incr(key);
    await client.expire(key, ttlSeconds);
    return count;
  }

  async readRunBudget(runId: string): Promise<number> {
    const value = await this.optionalClient()?.get(this.key('run', runId));
    return Number(value ?? 0);
  }

  async acquireConcurrencySlot(provider: string, maxConcurrent: number, ttlMs: number): Promise<boolean> {
    const client = this.requireClient();
    const key = this.key('concurrency', provider);
    const count = await client.incr(key);
    await client.expire(key, this.msToSeconds(ttlMs));
    if (count <= maxConcurrent) return true;
    await this.releaseConcurrencySlot(provider);
    return false;
  }

  async releaseConcurrencySlot(provider: string): Promise<void> {
    await this.optionalClient()?.del(this.key('concurrency', provider));
  }

  async setNegativeCache(keyHash: string, ttlMs: number): Promise<void> {
    await this.requireClient().set(this.key('negative', keyHash), '1', { EX: this.msToSeconds(ttlMs) });
  }

  async acquireDistributedLock(lockName: string, owner: string, ttlMs: number): Promise<boolean> {
    const result = await this.requireClient().set(this.key('lock', lockName), owner, { EX: this.msToSeconds(ttlMs), NX: true });
    return result === 'OK';
  }

  async acquireLock(lockName: string, owner: string, ttlMs: number): Promise<boolean> {
    return this.acquireDistributedLock(lockName, owner, ttlMs);
  }

  async releaseDistributedLock(lockName: string, owner: string): Promise<boolean> {
    const client = this.requireClient();
    const key = this.key('lock', lockName);
    const currentOwner = await client.get(key);
    if (currentOwner !== owner) return false;
    await client.del(key);
    return true;
  }

  async releaseLock(lockName: string, owner: string): Promise<boolean> {
    return this.releaseDistributedLock(lockName, owner);
  }

  async ttl(namespace: 'quota' | 'cooldown' | 'negative' | 'lock', ...parts: string[]): Promise<number> {
    return this.requireClient().ttl(this.key(namespace, ...parts));
  }

  resetForTests(): void {
    this.inFlight.clear();
    this.cache.clear();
    this.negativeCache.clear();
  }

  private optionalClient(): ProviderBrokerRedisClient {
    return this.client;
  }

  private requireClient(): ProviderBrokerRedisClient {
    return this.client;
  }

  private msToSeconds(ms: number): number {
    return Math.max(1, Math.ceil(ms / 1_000));
  }

  private sanitizeKeyPart(part: string): string {
    return part.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
  }
}
