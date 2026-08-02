/**
 * dataPlaneHealthContracts.ts — Internal types for data-plane health reporting.
 *
 * These types describe the health and status of the internal data plane.
 * They are internal-only and must not appear in any public UI copy.
 */

export interface ProviderHealth {
  totalCalls: number;
  errors: number;
  ok: boolean;
}

export interface CacheHealth {
  hitRate: number;
  staleEntries: number;
  totalEntries: number;
  ok: boolean;
}

export interface SnapshotHealth {
  kind: string;
  available: boolean;
  updatedAt: string | null;
  ok: boolean;
}

export interface QuotaHealth {
  totalCallsToday: number;
  totalCallsThisHour: number;
  budgetExhausted: boolean;
  ok: boolean;
}

export interface DataPlaneHealthReport {
  generatedAt: string;
  eodRefreshRun: {
    lastRun: string | null;
    ok: boolean;
  };
  precomputeRun: {
    lastRun: string | null;
    ok: boolean;
  };
  cacheCleanupRun: {
    lastRun: string | null;
    ok: boolean;
  };
  cache: CacheHealth;
  quota: QuotaHealth;
  snapshots: {
    available: number;
    total: number;
    ok: boolean;
  };
  circuitBreakers: {
    active: string[];
    ok: boolean;
  };
  overall: {
    ok: boolean;
    degraded: boolean;
  };
}
