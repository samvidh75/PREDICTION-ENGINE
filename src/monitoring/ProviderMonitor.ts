/**
 * ProviderMonitor — TRACK-35 Group C2
 * Tracks provider health over time with in-memory stats.
 */
export interface ProviderStats {
  successRate: number;
  avgLatency: number;
  lastFailure: string | null;
  consecutiveFailures: number;
  totalCalls: number;
  totalSuccesses: number;
}

export class ProviderMonitor {
  private stats = new Map<string, { totalCalls: number; totalSuccesses: number; latencies: number[]; lastFailure: string | null; consecutiveFailures: number }>();

  recordSuccess(provider: string, latencyMs: number): void {
    const s = this.getOrCreate(provider);
    s.totalCalls++;
    s.totalSuccesses++;
    s.latencies.push(latencyMs);
    s.consecutiveFailures = 0;
  }

  recordFailure(provider: string, error: string): void {
    const s = this.getOrCreate(provider);
    s.totalCalls++;
    s.consecutiveFailures++;
    s.lastFailure = new Date().toISOString();
  }

  getProviderStats(provider: string): ProviderStats {
    const s = this.stats.get(provider);
    if (!s) return { successRate: 0, avgLatency: 0, lastFailure: null, consecutiveFailures: 0, totalCalls: 0, totalSuccesses: 0 };
    return {
      successRate: s.totalCalls > 0 ? Math.round((s.totalSuccesses / s.totalCalls) * 100) : 0,
      avgLatency: s.latencies.length > 0 ? Math.round(s.latencies.reduce((a,b) => a + b, 0) / s.latencies.length) : 0,
      lastFailure: s.lastFailure,
      consecutiveFailures: s.consecutiveFailures,
      totalCalls: s.totalCalls,
      totalSuccesses: s.totalSuccesses,
    };
  }

  getAllStats(): Record<string, ProviderStats> {
    const result: Record<string, ProviderStats> = {};
    for (const [provider] of this.stats) {
      result[provider] = this.getProviderStats(provider);
    }
    return result;
  }

  private getOrCreate(provider: string) {
    if (!this.stats.has(provider)) {
      this.stats.set(provider, { totalCalls: 0, totalSuccesses: 0, latencies: [], lastFailure: null, consecutiveFailures: 0 });
    }
    return this.stats.get(provider)!;
  }
}

let _instance: ProviderMonitor | null = null;
export function getProviderMonitor(): ProviderMonitor { if (!_instance) _instance = new ProviderMonitor(); return _instance; }
export const providerMonitor = new Proxy({} as ProviderMonitor, { get: (_, prop) => (getProviderMonitor() as any)[prop] });
