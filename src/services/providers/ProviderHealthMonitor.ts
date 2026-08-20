// src/services/providers/ProviderHealthMonitor.ts
/**
 * Tracks health status of each provider instance.
 * Status levels: Healthy, Degraded, Unavailable.
 * Failure thresholds are configurable (default 5 for Degraded, 10 for Unavailable).
 *
 * Recovery: a provider marked Unavailable/RateLimited is re-probed once the
 * cooldown since its last failure elapses (half-open). Without this the monitor
 * latched permanently — ProviderCoordinator.invokeChain() skips any provider
 * reporting Unavailable/RateLimited, so it was never called again, so it could
 * never record the success that resets it. Ten cumulative failures over a
 * server's uptime (delisted symbols, transient network errors) therefore took
 * the provider offline until the process restarted, and every subsequent
 * request 503'd in ~1ms without attempting a fetch.
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
  private recoveryMs: number;

  constructor(degradedThreshold = 5, unavailableThreshold = 10, recoveryMs = 60_000) {
    this.degradedThreshold = degradedThreshold;
    this.unavailableThreshold = unavailableThreshold;
    this.recoveryMs = recoveryMs;
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

  /**
   * Effective status. A sidelined provider reports Degraded once its cooldown
   * has elapsed so the coordinator attempts it again; the underlying record
   * stays Unavailable, so a failed probe simply waits out another cooldown
   * while a success clears it via recordSuccess().
   */
  getStatus(provider: any): ProviderStatus {
    const rec = this.records.get(this.getKey(provider));
    if (!rec) return 'Healthy';

    const sidelined = rec.status === 'Unavailable' || rec.status === 'RateLimited';
    if (sidelined && this.cooldownElapsed(rec)) return 'Degraded';

    return rec.status;
  }

  private cooldownElapsed(rec: ProviderRecord): boolean {
    if (rec.lastFailureTime === undefined) return true;
    return Date.now() - rec.lastFailureTime >= this.recoveryMs;
  }
}
