/**
 * F3.1A — InMemoryProviderBrokerStore
 *
 * Deterministic in-memory store for the provider broker.
 * For tests, development, and explicitly single-instance deployments.
 * Multi-replica production requires Redis-backed store.
 */

import type { BrokerResult, CacheState } from './types';
import type { CacheLookup, InFlightRegistration, ProviderBrokerStore, QuotaWindow } from './ProviderBrokerStore';

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
  staleAt: number;
  state: CacheState;
}

export class InMemoryProviderBrokerStore implements ProviderBrokerStore {
  // Single-flight in-flight requests — stored as Promise<any> to avoid generic complications
  private inFlight = new Map<string, { promise: Promise<any>; createdAt: number; consumerCount: number }>();

  // Cache: key → { data, expiresAt, staleAt }
  private cache = new Map<string, CacheEntry>();

  // Negative cache: key → expiresAt
  private negativeCache = new Map<string, number>();
  private cooldowns = new Map<string, number>();
  private quotaCounters = new Map<string, number>();
  private runCounters = new Map<string, number>();
  private concurrencySlots = new Map<string, number>();
  private locks = new Map<string, { owner: string; expiresAt: number }>();

  /** Get or create an in-flight request. Returns true if this is the leader. */
  getOrCreateInFlight<T>(key: string, factory: () => Promise<BrokerResult<T>>): InFlightRegistration<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      existing.consumerCount++;
      return { promise: existing.promise as Promise<BrokerResult<T>>, isLeader: false };
    }

    const promise = factory() as Promise<any>;
    this.inFlight.set(key, { promise, createdAt: Date.now(), consumerCount: 1 });

    // Clean up on settle
    promise.finally(() => {
      this.inFlight.delete(key);
    });

    return { promise, isLeader: true };
  }

  /** Number of consumers attached to an in-flight request. */
  getInFlightConsumerCount(key: string): number {
    return this.inFlight.get(key)?.consumerCount ?? 0;
  }

  /** Check cache for a fresh hit. */
  getFresh<T>(key: string): CacheLookup<T> | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() < entry.expiresAt) {
      return { data: entry.data, staleAt: entry.staleAt };
    }
    return null;
  }

  /** Check cache for a stale hit (for stale-while-revalidate). */
  getStale<T>(key: string): CacheLookup<T> | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() < entry.staleAt) {
      return { data: entry.data, staleAt: entry.staleAt };
    }
    return null;
  }

  /** Store a successful response in cache. */
  setFresh<T>(key: string, data: T, ttlMs: number, staleWindowMs: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      expiresAt: now + ttlMs,
      staleAt: now + ttlMs + staleWindowMs,
      state: 'fresh',
    });
  }

  /** Check negative cache. */
  isNegativelyCached(key: string): boolean {
    const expiresAt = this.negativeCache.get(key);
    if (!expiresAt) return false;
    if (Date.now() < expiresAt) return true;
    this.negativeCache.delete(key);
    return false;
  }

  /** Store a negative cache entry (unavailable upstream result, bounded TTL). */
  setNegative(key: string, ttlMs: number): void {
    this.negativeCache.set(key, Date.now() + ttlMs);
  }

  async getCooldown(provider: string): Promise<number | null> {
    const cooldownUntil = this.cooldowns.get(this.providerKey(provider)) ?? 0;
    if (cooldownUntil > Date.now()) return cooldownUntil;
    this.cooldowns.delete(this.providerKey(provider));
    return null;
  }

  async setCooldown(provider: string, retryAfterMs: number): Promise<void> {
    this.cooldowns.set(this.providerKey(provider), Date.now() + retryAfterMs);
  }

  async incrementQuotaCounter(provider: string, window: QuotaWindow): Promise<number> {
    const key = this.quotaKey(provider, window);
    const next = (this.quotaCounters.get(key) ?? 0) + 1;
    this.quotaCounters.set(key, next);
    return next;
  }

  async readQuotaCounter(provider: string, window: QuotaWindow): Promise<number> {
    return this.quotaCounters.get(this.quotaKey(provider, window)) ?? 0;
  }

  async incrementRunBudget(runId: string): Promise<number> {
    const key = runId.trim() || 'default';
    const next = (this.runCounters.get(key) ?? 0) + 1;
    this.runCounters.set(key, next);
    return next;
  }

  async readRunBudget(runId: string): Promise<number> {
    return this.runCounters.get(runId.trim() || 'default') ?? 0;
  }

  async acquireConcurrencySlot(provider: string, maxConcurrent: number): Promise<boolean> {
    const key = this.providerKey(provider);
    const current = this.concurrencySlots.get(key) ?? 0;
    if (current >= maxConcurrent) return false;
    this.concurrencySlots.set(key, current + 1);
    return true;
  }

  async releaseConcurrencySlot(provider: string): Promise<void> {
    const key = this.providerKey(provider);
    this.concurrencySlots.set(key, Math.max(0, (this.concurrencySlots.get(key) ?? 0) - 1));
  }

  async acquireDistributedLock(lockName: string, owner: string, ttlMs: number): Promise<boolean> {
    const key = lockName.trim();
    const existing = this.locks.get(key);
    if (existing && existing.expiresAt > Date.now()) return false;
    this.locks.set(key, { owner, expiresAt: Date.now() + ttlMs });
    return true;
  }

  async releaseDistributedLock(lockName: string, owner: string): Promise<boolean> {
    const key = lockName.trim();
    const existing = this.locks.get(key);
    if (!existing || existing.owner !== owner) return false;
    this.locks.delete(key);
    return true;
  }

  /** Clear all state (for test isolation). */
  resetForTests(): void {
    this.inFlight.clear();
    this.cache.clear();
    this.negativeCache.clear();
    this.cooldowns.clear();
    this.quotaCounters.clear();
    this.runCounters.clear();
    this.concurrencySlots.clear();
    this.locks.clear();
  }

  clear(): void {
    this.resetForTests();
  }

  private providerKey(provider: string): string {
    return provider.trim().toLowerCase();
  }

  private quotaKey(provider: string, window: QuotaWindow): string {
    return `${this.providerKey(provider)}:${window}`;
  }
}
