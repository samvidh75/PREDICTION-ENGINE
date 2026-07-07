/**
 * ProviderQuotaMonitor — Tracks provider call counts and budgets.
 *
 * Each time a provider is called (or would have been called if not for
 * a cache hit), the monitor records it.  The data is stored in the `cache`
 * table as rolling counters so it survives restarts and is visible to
 * admin/internal reports.
 *
 * Budget dimensions tracked:
 *   - Total provider calls per time window (hourly / daily)
 *   - Per-provider call counts
 *   - Per-namespace (quote, profile, etc.) call counts
 *   - Cache-hit rates (how many requests were served without a provider call)
 */

import { dbAdapter } from '../../db/DatabaseAdapter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuotaReport {
  summary: {
    totalCallsToday: number;
    totalCallsThisHour: number;
    cacheHitRate: number;
    budgetExhausted: boolean;
  };
  perProvider: Record<string, number>;
  perNamespace: Record<string, number>;
  providerErrors: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

function todayKey(): string {
  const d = new Date();
  return `_quota:d:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function hourKey(): string {
  const d = new Date();
  return `_quota:h:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}`;
}

function providerKey(providerName: string): string {
  return `_quota:p:${providerName}:${todayKey()}`;
}

function namespaceKey(namespace: string): string {
  return `_quota:n:${namespace}:${todayKey()}`;
}

function errorKey(providerName: string): string {
  return `_quota:e:${providerName}:${todayKey()}`;
}

// ---------------------------------------------------------------------------
// Quota budget
// ---------------------------------------------------------------------------

const DAILY_CALL_BUDGET = 1000;
const HOURLY_CALL_BUDGET = 150;

// ---------------------------------------------------------------------------
// Monitor
// ---------------------------------------------------------------------------

export class ProviderQuotaMonitor {
  /**
   * Record that a provider call was made.
   */
  static async recordCall(
    providerName: string,
    namespace: string,
    success: boolean,
  ): Promise<void> {
    const ttl = 86_400_000; // 24h

    try {
      // Total daily counter
      await incrementCounter(todayKey(), ttl);
      // Total hourly counter
      await incrementCounter(hourKey(), 3_600_000);
      // Per-provider counter
      await incrementCounter(providerKey(providerName), ttl);
      // Per-namespace counter
      await incrementCounter(namespaceKey(namespace), ttl);

      if (!success) {
        await incrementCounter(errorKey(providerName), ttl);
      }
    } catch {
      // Best-effort — quota tracking never blocks
    }
  }

  /**
   * Record that a cached response was served (no provider call needed).
   */
  static async recordCacheHit(): Promise<void> {
    // We track cache hits separately so we can compute hit rate.
    try {
      await incrementCounter('_quota:cache:hit:' + todayKey(), 86_400_000);
    } catch {
      // Best-effort
    }
  }

  /**
   * Record a cache miss that would have gone to provider.
   */
  static async recordCacheMiss(): Promise<void> {
    try {
      await incrementCounter('_quota:cache:miss:' + todayKey(), 86_400_000);
    } catch {
      // Best-effort
    }
  }

  /**
   * Check if the hourly budget is exhausted.
   */
  static async isHourlyBudgetExhausted(): Promise<boolean> {
    const count = await getCounter(hourKey());
    return count >= HOURLY_CALL_BUDGET;
  }

  /**
   * Check if the daily budget is exhausted.
   */
  static async isDailyBudgetExhausted(): Promise<boolean> {
    const count = await getCounter(todayKey());
    return count >= DAILY_CALL_BUDGET;
  }

  /**
   * Return a full quota report for admin/internal views.
   */
  static async getReport(): Promise<QuotaReport> {
    const today = await getCounter(todayKey());
    const hour = await getCounter(hourKey());
    const cacheHits = await getCounter('_quota:cache:hit:' + todayKey());
    const cacheMisses = await getCounter('_quota:cache:miss:' + todayKey());
    const totalLookups = cacheHits + cacheMisses;
    const cacheHitRate = totalLookups > 0 ? cacheHits / totalLookups : 0;

    return {
      summary: {
        totalCallsToday: today,
        totalCallsThisHour: hour,
        cacheHitRate,
        budgetExhausted: today >= DAILY_CALL_BUDGET || hour >= HOURLY_CALL_BUDGET,
      },
      perProvider: {},
      perNamespace: {},
      providerErrors: {},
    };
  }
}

// ---------------------------------------------------------------------------
// Counter helpers
// ---------------------------------------------------------------------------

async function incrementCounter(key: string, ttlMs: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  await dbAdapter.query(
    `IPSERT INTO cache (key, value, expires_at)
     VALUES ($1, '1', $2)
     ON CONFLICT (key) DO UPDATE
       SET value = (CAST(cache.value AS INTEGER) + 1)::TEXT, expires_at = $2`,
    [key, expiresAt],
  );
}

async function getCounter(key: string): Promise<number> {
  try {
    const res = await dbAdapter.query(
      'SELECT value FROM cache WHERE key = $1 AND expires_at > CURRENT_TIMESTAMP',
      [key],
    );
    if (res.rows.length === 0) return 0;
    return parseInt(res.rows[0].value as string, 10) || 0;
  } catch {
    return 0;
  }
}
