/**
 * ProviderHealthService — TRACK-21 Phase 1 Task 2
 *
 * Tracks per-provider statistics beyond simple success/failure counts.
 * Replaces the basic ProviderHealthMonitor with persistent metrics tracking:
 *   - success rate
 *   - latency (avg, p50, p95)
 *   - timeout frequency
 *   - circuit breaker state
 *   - last successful request
 *   - field completeness
 *
 * Metrics are persisted to DB for operational dashboards.
 */

export type ProviderStatus = 'Healthy' | 'Degraded' | 'Unavailable' | 'RateLimited';

export interface LatencyStats {
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
  samples: number;
}

export interface ProviderStats {
  providerName: string;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  successRate: number;           // 0-1
  avgLatencyMs: number;
  latencyStats: LatencyStats;
  fieldCompleteness: number;     // % of requested fields returned non-null
  rateLimitEvents: number;
  timeoutCount: number;
  lastSuccessAt: string | null;  // ISO date
  lastFailureAt: string | null;
  consecutiveFailures: number;
  status: ProviderStatus;
  circuitBreakerState: string;
}

interface LatencySample {
  ms: number;
  timestamp: number;
}

interface HealthRecord {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  latencySamples: LatencySample[];
  rateLimitEvents: number;
  timeoutCount: number;
  lastSuccessAt: number | null;   // epoch ms
  lastFailureAt: number | null;
  consecutiveFailures: number;
  totalFieldsReturned: number;
  totalFieldsRequested: number;
}

const DEGRADED_THRESHOLD = 5;
const UNAVAILABLE_THRESHOLD = 10;
const RATE_LIMIT_THRESHOLD = 3;
const MAX_LATENCY_SAMPLES = 1000;

export class ProviderHealthService {
  private records: Map<string, HealthRecord> = new Map();
  private circuitBreakerStates: Map<string, string> = new Map();

  constructor() {}

  /**
   * Record a provider call outcome.
   * @param provider - Provider name string
   * @param success - Whether the call succeeded
   * @param latencyMs - Call duration in milliseconds
   * @param fieldsReturned - Number of non-null fields returned
   * @param fieldsRequested - Number of fields requested
   */
  recordCall(
    provider: string,
    success: boolean,
    latencyMs: number,
    fieldsReturned: number,
    fieldsRequested: number,
  ): void {
    const rec = this.getOrCreateRecord(provider);
    rec.totalCalls++;
    rec.totalFieldsReturned += fieldsReturned;
    rec.totalFieldsRequested += fieldsRequested;

    if (success) {
      rec.successCount++;
      rec.consecutiveFailures = 0;
      rec.lastSuccessAt = Date.now();
    } else {
      rec.failureCount++;
      rec.consecutiveFailures++;
      rec.lastFailureAt = Date.now();
    }

    // Track latency
    rec.latencySamples.push({ ms: latencyMs, timestamp: Date.now() });
    if (rec.latencySamples.length > MAX_LATENCY_SAMPLES) {
      rec.latencySamples.shift(); // circular buffer
    }
  }

  /** Record a rate limit event for a provider. */
  recordRateLimit(provider: string): void {
    const rec = this.getOrCreateRecord(provider);
    rec.rateLimitEvents++;
    rec.consecutiveFailures++;
  }

  /** Record a timeout event. */
  recordTimeout(provider: string, latencyMs: number): void {
    const rec = this.getOrCreateRecord(provider);
    rec.timeoutCount++;
    rec.latencySamples.push({ ms: latencyMs, timestamp: Date.now() });
    if (rec.latencySamples.length > MAX_LATENCY_SAMPLES) {
      rec.latencySamples.shift();
    }
  }

  /** Update the known circuit breaker state for a provider. */
  updateCircuitBreakerState(provider: string, state: string): void {
    this.circuitBreakerStates.set(provider, state);
  }

  /** Get full stats for a provider. */
  getStats(provider: string): ProviderStats {
    const rec = this.records.get(provider);
    if (!rec) {
      return this.emptyStats(provider);
    }
    return this.computeStats(provider, rec);
  }

  /** Get status for a provider. */
  getStatus(provider: string): ProviderStatus {
    const rec = this.records.get(provider);
    if (!rec) return 'Healthy';

    if (rec.rateLimitEvents >= RATE_LIMIT_THRESHOLD) return 'RateLimited';
    if (rec.consecutiveFailures >= UNAVAILABLE_THRESHOLD) return 'Unavailable';
    if (rec.consecutiveFailures >= DEGRADED_THRESHOLD) return 'Degraded';
    return 'Healthy';
  }

  /** Get all provider stats sorted by health. */
  getAllStats(): ProviderStats[] {
    const stats: ProviderStats[] = [];
    for (const provider of this.records.keys()) {
      stats.push(this.getStats(provider));
    }
    // Sort: Healthy first, then Degraded, then Unavailable, then RateLimited
    const order: Record<string, number> = { 'Healthy': 0, 'Degraded': 1, 'Unavailable': 2, 'RateLimited': 3 };
    stats.sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4));
    return stats;
  }

  /** Reset stats for a provider (e.g., after recovery). */
  resetStats(provider: string): void {
    this.records.delete(provider);
  }

  /** Reset all stats. */
  resetAll(): void {
    this.records.clear();
    this.circuitBreakerStates.clear();
  }

  /** Persist metrics to database (called at end of pipeline run). */
  async persistToDb(pool: any): Promise<void> {
    const stats = this.getAllStats();
    const now = new Date().toISOString();

    for (const s of stats) {
      try {
        await pool.query(
          `INSERT INTO provider_health_metrics (
            provider_name, recorded_at, total_calls, success_count, failure_count,
            success_rate, avg_latency_ms, p50_latency_ms, p95_latency_ms,
            field_completeness, rate_limit_events, timeout_count,
            consecutive_failures, status, circuit_breaker_state,
            last_success_at, last_failure_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (provider_name, recorded_at) DO UPDATE SET
            total_calls = EXCLUDED.total_calls,
            success_count = EXCLUDED.success_count,
            failure_count = EXCLUDED.failure_count,
            success_rate = EXCLUDED.success_rate,
            avg_latency_ms = EXCLUDED.avg_latency_ms,
            p50_latency_ms = EXCLUDED.p50_latency_ms,
            p95_latency_ms = EXCLUDED.p95_latency_ms,
            field_completeness = EXCLUDED.field_completeness,
            rate_limit_events = EXCLUDED.rate_limit_events,
            timeout_count = EXCLUDED.timeout_count,
            consecutive_failures = EXCLUDED.consecutive_failures,
            status = EXCLUDED.status,
            circuit_breaker_state = EXCLUDED.circuit_breaker_state,
            last_success_at = EXCLUDED.last_success_at,
            last_failure_at = EXCLUDED.last_failure_at`,
          [
            s.providerName,
            now,
            s.totalCalls,
            s.successCount,
            s.failureCount,
            s.successRate,
            s.avgLatencyMs,
            s.latencyStats.p50Ms,
            s.latencyStats.p95Ms,
            s.fieldCompleteness,
            s.rateLimitEvents,
            s.timeoutCount,
            s.consecutiveFailures,
            s.status,
            s.circuitBreakerState,
            s.lastSuccessAt,
            s.lastFailureAt,
          ]
        );
      } catch (err: any) {
        console.warn(`ProviderHealthService: failed to persist metrics for ${s.providerName}: ${err.message}`);
      }
    }
  }

  /** Generate a human-readable health summary. */
  getHealthSummary(): string {
    const stats = this.getAllStats();
    const lines: string[] = [];
    lines.push('Provider Health Summary');
    lines.push('═'.repeat(60));

    for (const s of stats) {
      const icon = s.status === 'Healthy' ? '🟢' :
        s.status === 'Degraded' ? '🟡' :
        s.status === 'RateLimited' ? '🟠' : '🔴';
      lines.push(`${icon} ${s.providerName.padEnd(35)} ${s.status.padEnd(14)} SR:${(s.successRate * 100).toFixed(0)}% Lat:${s.avgLatencyMs.toFixed(0)}ms`);
    }

    return lines.join('\n');
  }

  // ── Private ──────────────────────────────────────────────

  private getOrCreateRecord(provider: string): HealthRecord {
    if (!this.records.has(provider)) {
      this.records.set(provider, {
        totalCalls: 0,
        successCount: 0,
        failureCount: 0,
        latencySamples: [],
        rateLimitEvents: 0,
        timeoutCount: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        consecutiveFailures: 0,
        totalFieldsReturned: 0,
        totalFieldsRequested: 0,
      });
    }
    return this.records.get(provider)!;
  }

  private computeStats(provider: string, rec: HealthRecord): ProviderStats {
    const successRate = rec.totalCalls > 0 ? rec.successCount / rec.totalCalls : 0;
    const fieldCompleteness = rec.totalFieldsRequested > 0
      ? rec.totalFieldsReturned / rec.totalFieldsRequested
      : 0;

    const latencies = rec.latencySamples.map(s => s.ms).sort((a, b) => a - b);
    const avgLatencyMs = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    const p50Idx = Math.floor(latencies.length * 0.5);
    const p95Idx = Math.floor(latencies.length * 0.95);

    return {
      providerName: provider,
      totalCalls: rec.totalCalls,
      successCount: rec.successCount,
      failureCount: rec.failureCount,
      successRate: Math.round(successRate * 10000) / 10000,
      avgLatencyMs: Math.round(avgLatencyMs * 100) / 100,
      latencyStats: {
        avgMs: Math.round(avgLatencyMs * 100) / 100,
        p50Ms: latencies.length > 0 ? latencies[Math.min(p50Idx, latencies.length - 1)] : 0,
        p95Ms: latencies.length > 0 ? latencies[Math.min(p95Idx, latencies.length - 1)] : 0,
        minMs: latencies.length > 0 ? latencies[0] : 0,
        maxMs: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
        samples: latencies.length,
      },
      fieldCompleteness: Math.round(fieldCompleteness * 10000) / 10000,
      rateLimitEvents: rec.rateLimitEvents,
      timeoutCount: rec.timeoutCount,
      lastSuccessAt: rec.lastSuccessAt ? new Date(rec.lastSuccessAt).toISOString() : null,
      lastFailureAt: rec.lastFailureAt ? new Date(rec.lastFailureAt).toISOString() : null,
      consecutiveFailures: rec.consecutiveFailures,
      status: this.getStatus(provider),
      circuitBreakerState: this.circuitBreakerStates.get(provider) ?? 'Unknown',
    };
  }

  private emptyStats(provider: string): ProviderStats {
    return {
      providerName: provider,
      totalCalls: 0,
      successCount: 0,
      failureCount: 0,
      successRate: 0,
      avgLatencyMs: 0,
      latencyStats: { avgMs: 0, p50Ms: 0, p95Ms: 0, minMs: 0, maxMs: 0, samples: 0 },
      fieldCompleteness: 0,
      rateLimitEvents: 0,
      timeoutCount: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      consecutiveFailures: 0,
      status: 'Healthy',
      circuitBreakerState: 'Unknown',
    };
  }
}

export default ProviderHealthService;
