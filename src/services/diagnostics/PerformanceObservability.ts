// src/services/diagnostics/PerformanceObservability.ts

export interface PerformanceMetric {
  metricName: string;
  valueMs: number;
  timestamp: number;
}

export class PerformanceObservability {
  private static metrics: PerformanceMetric[] = [];

  public static trackMetric(metricName: string, valueMs: number): void {
    const metric: PerformanceMetric = {
      metricName,
      valueMs,
      timestamp: Date.now(),
    };
    this.metrics.push(metric);
    console.info(`[PerformanceObservability] Logged ${metricName}: ${valueMs}ms`);
  }

  public static getAverageLatency(metricName: string): number {
    const matched = this.metrics.filter((m) => m.metricName === metricName);
    if (matched.length === 0) return 0;
    const sum = matched.reduce((acc, curr) => acc + curr.valueMs, 0);
    return parseFloat((sum / matched.length).toFixed(1));
  }
}
