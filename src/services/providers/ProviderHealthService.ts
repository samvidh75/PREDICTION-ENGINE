export type ProviderHealthStatus = 'Healthy' | 'Degraded' | 'Unavailable' | 'RateLimited';

export interface ProviderHealthSnapshot {
  provider: string;
  status: ProviderHealthStatus;
  successCount: number;
  failureCount: number;
  requestCount: number;
  errorRate: number;
  averageLatencyMs: number;
  completenessAverage: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
}

interface MutableProviderHealth {
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
  totalCompleteness: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  rateLimitedUntil: number | null;
}

/**
 * Tracks real provider behaviour without synthetic substitution.
 * The service is intentionally in-memory so it can be embedded in the
 * coordinator immediately; callers may persist snapshots to telemetry later.
 */
export class ProviderHealthService {
  private readonly state = new Map<string, MutableProviderHealth>();

  recordSuccess(provider: string, latencyMs: number, completeness = 1): void {
    const health = this.getMutable(provider);
    health.successCount += 1;
    health.totalLatencyMs += Math.max(0, latencyMs);
    health.totalCompleteness += this.clampCompleteness(completeness);
    health.lastSuccessAt = new Date().toISOString();
    health.lastError = null;
  }

  recordFailure(provider: string, latencyMs: number, error: unknown): void {
    const health = this.getMutable(provider);
    health.failureCount += 1;
    health.totalLatencyMs += Math.max(0, latencyMs);
    health.lastFailureAt = new Date().toISOString();
    health.lastError = error instanceof Error ? error.message : String(error);
  }

  recordRateLimit(provider: string, retryAfterMs: number): void {
    const health = this.getMutable(provider);
    health.rateLimitedUntil = Date.now() + Math.max(0, retryAfterMs);
  }

  getStatus(provider: string): ProviderHealthStatus {
    const health = this.getMutable(provider);
    if (health.rateLimitedUntil && health.rateLimitedUntil > Date.now()) return 'RateLimited';
    const requestCount = health.successCount + health.failureCount;
    if (requestCount === 0) return 'Healthy';
    const errorRate = health.failureCount / requestCount;
    if (health.successCount === 0 && health.failureCount >= 3) return 'Unavailable';
    if (errorRate >= 0.35) return 'Degraded';
    return 'Healthy';
  }

  getSnapshot(provider: string): ProviderHealthSnapshot {
    const health = this.getMutable(provider);
    const requestCount = health.successCount + health.failureCount;
    return {
      provider,
      status: this.getStatus(provider),
      successCount: health.successCount,
      failureCount: health.failureCount,
      requestCount,
      errorRate: requestCount > 0 ? health.failureCount / requestCount : 0,
      averageLatencyMs: requestCount > 0 ? health.totalLatencyMs / requestCount : 0,
      completenessAverage: health.successCount > 0 ? health.totalCompleteness / health.successCount : 0,
      lastSuccessAt: health.lastSuccessAt,
      lastFailureAt: health.lastFailureAt,
      lastError: health.lastError,
    };
  }

  getAllSnapshots(): ProviderHealthSnapshot[] {
    return Array.from(this.state.keys()).map(provider => this.getSnapshot(provider));
  }

  private getMutable(provider: string): MutableProviderHealth {
    const existing = this.state.get(provider);
    if (existing) return existing;
    const created: MutableProviderHealth = {
      successCount: 0,
      failureCount: 0,
      totalLatencyMs: 0,
      totalCompleteness: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      rateLimitedUntil: null,
    };
    this.state.set(provider, created);
    return created;
  }

  private clampCompleteness(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }
}

export default ProviderHealthService;
