// src/services/providers/ProviderHealthMonitor.ts
/**
 * Tracks health status of each provider instance.
 * Status levels: Healthy, Degraded, Unavailable.
 * Failure thresholds are configurable (default 5 for Degraded, 10 for Unavailable).
 */
export type ProviderStatus = 'Healthy' | 'Degraded' | 'Unavailable' | 'RateLimited';

interface ProviderRecord {
  failures: number;
  status: ProviderStatus;
  lastFailureTime?: number;
}

export class ProviderHealthMonitor {
  private records: Map<string, ProviderRecord> = new Map();
  private degradedThreshold: number;
  private unavailableThreshold: number;

  constructor(degradedThreshold = 5, unavailableThreshold = 10) {
    this.degradedThreshold = degradedThreshold;
    this.unavailableThreshold = unavailableThreshold;
  }

  private getKey(provider: any): string {
    // Use constructor name as identifier
    return provider.constructor.name;
  }

  recordSuccess(provider: any) {
    const key = this.getKey(provider);
    this.records.set(key, { failures: 0, status: 'Healthy' });
  }

  recordFailure(provider: any) {
    const key = this.getKey(provider);
    const rec = this.records.get(key) ?? { failures: 0, status: 'Healthy' };
    rec.failures += 1;
    rec.lastFailureTime = Date.now();
    if (rec.failures >= this.unavailableThreshold) {
      rec.status = 'Unavailable';
    } else if (rec.failures >= this.degradedThreshold) {
      rec.status = 'Degraded';
    }
    this.records.set(key, rec);
  }

  getStatus(provider: any): ProviderStatus {
    const key = this.getKey(provider);
    return this.records.get(key)?.status ?? 'Healthy';
  }

  // Optional: reset after cooldown (not required for MVP)
}
