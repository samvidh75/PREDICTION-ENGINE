/**
 * F3.1A — InMemoryProviderBrokerStore
 *
 * Deterministic in-memory store for the provider broker.
 * For tests, development, and explicitly single-instance deployments.
 * Multi-replica production requires Redis-backed store.
 */

import type { BrokerResult, CacheState } from './types';

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
  staleAt: number;
  state: CacheState;
}

export class InMemoryProviderBrokerStore {
  // Single-flight in-flight requests — stored as Promise<any> to avoid generic complications
  private inFlight = new Map<string, { promise: Promise<any>; createdAt: number; consumerCount: number }>();

  // Cache: key → { data, expiresAt, staleAt }
  private cache = new Map<string, CacheEntry>();

  // Negative cache: key → expiresAt
  private negativeCache = new Map<string, number>();

  /** Get or create an in-flight request. Returns true if this is the leader. */
  getOrCreateInFlight<T>(key: string, factory: () => Promise<BrokerResult<T>>): { promise: Promise<BrokerResult<T>>; isLeader: boolean } {
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

  /** Check cache for a fresh hit. */
  getFresh<T>(key: string): { data: T; staleAt: number } | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() < entry.expiresAt) {
      return { data: entry.data, staleAt: entry.staleAt };
    }
    return null;
  }

  /** Check cache for a stale hit (for stale-while-revalidate). */
  getStale<T>(key: string): { data: T; staleAt: number } | null {
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

  /** Clear all state (for test isolation). */
  clear(): void {
    this.inFlight.clear();
    this.cache.clear();
    this.negativeCache.clear();
  }
}
