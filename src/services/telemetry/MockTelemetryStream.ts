import { HealthMetric, HealthStatus } from '../../types/healthometer';

export class MockTelemetryStream {
  private static instance: MockTelemetryStream;
  private interval: NodeJS.Timeout | null = null;

  // Simulate Indian market sector drift
  private baseMetrics: HealthMetric[] = [
    { id: 'nse_vol', label: 'NSE Liquidity', value: 78, weight: 0.4, trend: 'neutral' },
    { id: 'bse_sent', label: 'BSE Sentiment', value: 65, weight: 0.3, trend: 'improving' },
    { id: 'sme_risk', label: 'SME Alpha', value: 42, weight: 0.3, trend: 'declining' },
  ];

  public static getInstance(): MockTelemetryStream {
    if (!this.instance) this.instance = new MockTelemetryStream();
    return this.instance;
  }

  public subscribe(callback: (data: any) => void) {
    this.interval = setInterval(() => {
      const updatedMetrics = this.baseMetrics.map(m => {
        const change = (Math.random() * 4 - 2);
        const newValue = Math.min(100, Math.max(0, m.value + change));
        return {
          ...m,
          value: Number(newValue.toFixed(2)),
          trend: (change > 0 ? 'improving' : 'declining') as 'improving' | 'declining' | 'neutral'
        };
      });

      callback({
        total: Number(updatedMetrics.reduce((acc, m) => acc + (m.value * m.weight), 0).toFixed(2)),
        status: this.calculateStatus(updatedMetrics),
        metrics: updatedMetrics,
        lastUpdated: new Date().toISOString()
      });
    }, 2000); // 2s polling interval for UI-animation stress testing
  }

  private calculateStatus(metrics: HealthMetric[]): HealthStatus {
    const avg = metrics.reduce((acc, m) => acc + m.value, 0) / metrics.length;
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

export default MockTelemetryStream;
