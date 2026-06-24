import { HealthMetric, HealthStatus } from '../../types/healthometer';

/**
 * LiveTelemetryStream — polls the /api/healthometer endpoint for live
 * market health metrics instead of generating mock data with random drift.
 */
export class LiveTelemetryStream {
  private static instance: LiveTelemetryStream;
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastSnapshot: any = null;

  public static getInstance(): LiveTelemetryStream {
    if (!this.instance) this.instance = new LiveTelemetryStream();
    return this.instance;
  }

  public subscribe(callback: (data: any) => void) {
    // Fetch initial snapshot immediately
    this.fetchAndDeliver(callback);

    // Poll every 30 seconds
    this.interval = setInterval(() => {
      this.fetchAndDeliver(callback);
    }, 30_000);
  }

  private async fetchAndDeliver(callback: (data: any) => void) {
    try {
      const response = await fetch('/api/healthometer', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        // Deliver last known snapshot if API is temporarily down
        if (this.lastSnapshot) callback(this.lastSnapshot);
        return;
      }

      const data = await response.json();
      if (!data || !data.metrics) {
        if (this.lastSnapshot) callback(this.lastSnapshot);
        return;
      }

      const snapshot = {
        total: Number(data.total ?? (data.metrics.reduce((acc: number, m: any) => acc + (m.value * (m.weight || 0.33)), 0))),
        status: data.status || this.calculateStatus(data.metrics),
        metrics: data.metrics.map((m: any) => ({
          id: m.id || `metric_${(globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296).toString(36).substr(2, 6)}`,
          label: m.label || 'Unknown',
          value: Number(m.value) || 50,
          weight: Number(m.weight) || 0.33,
          trend: m.trend || 'neutral',
        })),
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };

      this.lastSnapshot = snapshot;
      callback(snapshot);
    } catch {
      // Deliver last known snapshot if fetch fails
      if (this.lastSnapshot) callback(this.lastSnapshot);
    }
  }

  private calculateStatus(metrics: HealthMetric[]): HealthStatus {
    const avg = metrics.reduce((acc, m) => acc + (m.value * (m.weight || 0.33)), 0);
    if (avg > 80) return 'very-healthy';
    if (avg > 60) return 'healthy';
    if (avg > 40) return 'stable';
    return 'weakening';
  }

  public unsubscribe() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// Keep the old export name for backward compatibility with existing imports
export const MockTelemetryStream = LiveTelemetryStream;

export default LiveTelemetryStream;
