/**
 * Intelligence Cache — Persistence Layer
 *
 * Provides optional caching for intelligence reports using SQLite
 * or in-memory store. In production, this wraps a distributed cache.
 *
 * Each cached entry has a configurable TTL.
 */

import type { StockIntelligenceReport } from '../types';

export interface CacheEntry {
  report: StockIntelligenceReport;
  cachedAt: string;
  expiresAt: string;
}

export class IntelligenceCache {
  private store = new Map<string, CacheEntry>();
  private defaultTTLMs: number;

  constructor(defaultTTLMinutes: number = 30) {
    this.defaultTTLMs = defaultTTLMinutes * 60 * 1000;
  }

  /** Build a cache key from symbol + optional date */
  key(symbol: string, tradeDate?: string): string {
    return `${symbol.toUpperCase()}_${tradeDate ?? 'latest'}`;
  }

  /** Retrieve a cached report if it exists and hasn't expired. */
  get(symbol: string, tradeDate?: string): StockIntelligenceReport | null {
    const k = this.key(symbol, tradeDate);
    const entry = this.store.get(k);
    if (!entry) return null;

    if (Date.now() > new Date(entry.expiresAt).getTime()) {
      this.store.delete(k);
      return null;
    }

    return entry.report;
  }

  /** Store a report with TTL. */
  set(
    report: StockIntelligenceReport,
    ttlMs?: number
  ): void {
    const k = this.key(report.symbol);
    const now = Date.now();
    const ttl = ttlMs ?? this.defaultTTLMs;

    this.store.set(k, {
      report,
      cachedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttl - 1).toISOString(), // -1ms ensures immediate expiry for 0 TTL
    });
  }

  /** Invalidate a cached entry. */
  invalidate(symbol: string, tradeDate?: string): void {
    this.store.delete(this.key(symbol, tradeDate));
  }

  /** Clear the entire cache. */
  clear(): void {
    this.store.clear();
  }

  /** Number of cached entries. */
  get size(): number {
    return this.store.size;
  }

  /** Remove all expired entries and return the count. */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    for (const [k, v] of this.store) {
      if (now > new Date(v.expiresAt).getTime()) {
        this.store.delete(k);
        evicted++;
      }
    }
    return evicted;
  }
}

export const globalIntelligenceCache = new IntelligenceCache();
