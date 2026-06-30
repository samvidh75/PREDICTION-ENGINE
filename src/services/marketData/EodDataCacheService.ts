/**
 * EodDataCacheService — Server-side DB-backed cache for EOD market data.
 *
 * Provides persistent caching across sessions and restarts by storing
 * serialized data in the `cache` DB table with application-side TTL
 * enforcement (no DB-specific interval syntax, works with both PG and SQLite).
 *
 * Cache layering:
 *   1. In-memory DataCache (30s–5min, per-page-session)
 *   2. EodDataCacheService  DB  (24h–7d, persistent, shared across users)
 *   3. ProviderCoordinator   (final fallback, quota-budgeted)
 *
 * TTL Policy (EOD-first):
 *   - quotes:       24h (stale after market close, next EOD refresh)
 *   - profiles:     7d  (company metadata rarely changes)
 *   - financials:   7d  (fundamentals update quarterly)
 *   - history:      7d  (daily OHLCV, one fetch per week is ample for EOD)
 *   - news:         4h  (news is time-sensitive, but cached briefly)
 */

import { dbAdapter } from '../../db/DatabaseAdapter';
import { ProviderQuotaMonitor } from '../scheduler/ProviderQuotaMonitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EodCacheNamespace = 'quote' | 'profile' | 'financials' | 'history' | 'news';

export type EodTtlMap = Record<EodCacheNamespace, number>;

// ---------------------------------------------------------------------------
// Default TTLs (milliseconds)
// ---------------------------------------------------------------------------

const DEFAULT_TTLS: EodTtlMap = {
  quote:      86_400_000,  // 24h
  profile:    604_800_000, // 7d
  financials: 604_800_000, // 7d
  history:    604_800_000, // 7d
  news:       14_400_000,  // 4h
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildKey(namespace: EodCacheNamespace, symbol: string): string {
  return `eod:${namespace}:${symbol.toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class EodDataCacheService {
  /**
   * Retrieve a cached value from the DB cache.
   * Returns `null` if the key is missing or expired.
   */
  static async get<T>(namespace: EodCacheNamespace, symbol: string): Promise<T | null> {
    const key = buildKey(namespace, symbol);

    try {
      const res = await dbAdapter.query(
        'SELECT value, expires_at FROM cache WHERE key = $1',
        [key],
      );

      if (res.rows.length === 0) {
        ProviderQuotaMonitor.recordCacheMiss().catch(() => {});
        return null;
      }

      const row = res.rows[0];

      // Check expiry using the stored expires_at column
      // (works for both PG TIMESTAMP and SQLite text)
      const expiresAt = new Date(row.expires_at as string);
      if (expiresAt <= new Date()) {
        // Expired — delete and return null (lazy cleanup)
        await dbAdapter.query('DELETE FROM cache WHERE key = $1', [key]);
        ProviderQuotaMonitor.recordCacheMiss().catch(() => {});
        return null;
      }

      ProviderQuotaMonitor.recordCacheHit().catch(() => {});
      return JSON.parse(row.value as string) as T;
    } catch {
      // Cache miss / DB error — fall through to upstream
      ProviderQuotaMonitor.recordCacheMiss().catch(() => {});
      return null;
    }
  }

  /**
   * Store a value in the DB cache with the given namespace's default TTL.
   */
  static async set<T>(
    namespace: EodCacheNamespace,
    symbol: string,
    value: T,
    ttlMs?: number,
  ): Promise<void> {
    const key = buildKey(namespace, symbol);
    const ttl = ttlMs ?? DEFAULT_TTLS[namespace];
    const expiresAt = new Date(Date.now() + ttl).toISOString();
    const serialized = JSON.stringify(value);

    try {
      await dbAdapter.query(
        `INSERT INTO cache (key, value, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE
           SET value = $2, expires_at = $3`,
        [key, serialized, expiresAt],
      );
    } catch {
      // Best-effort cache write — failure should never block the caller
    }
  }

  /**
   * Invalidate a single cache entry immediately.
   */
  static async invalidate(namespace: EodCacheNamespace, symbol: string): Promise<void> {
    const key = buildKey(namespace, symbol);
    try {
      await dbAdapter.query('DELETE FROM cache WHERE key = $1', [key]);
    } catch {
      // Best-effort
    }
  }

  /**
   * Return the default TTL map (useful for diagnostics and scheduling).
   */
  static getDefaultTtls(): EodTtlMap {
    return { ...DEFAULT_TTLS };
  }

  /**
   * Delete all expired cache entries.
   * Safe to call periodically (e.g. once per hour on server start).
   */
  static async cleanupExpired(): Promise<number> {
    try {
      const res = await dbAdapter.query('DELETE FROM cache WHERE expires_at < CURRENT_TIMESTAMP');
      return res.rowCount;
    } catch {
      return 0;
    }
  }
}
