import { describe, it, expect } from 'vitest';

const passThresholds = {
  activationFunnelRate: { min: 0.3, label: 'Activation funnel ≥ 30%' },
  d7Retention: { min: 0.2, label: 'D7 retention ≥ 20%' },
  researchQuality: { min: 0.5, label: 'Research quality ≥ 50%' },
  searchSuccess: { min: 0.8, label: 'Search success ≥ 80%' },
  alertActionRate: { min: 0.1, label: 'Alert action rate ≥ 10%' },
  dataFreshness: { max: 3600, label: 'Data freshness ≤ 1 hour' },
  errorRate: { max: 0.05, label: 'Error rate ≤ 5%' },
};

function evaluateGate(metrics: Record<string, number>): { passes: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const [key, threshold] of Object.entries(passThresholds)) {
    const value = metrics[key];
    if (value === undefined) {
      failures.push(`Missing metric: ${threshold.label}`);
      continue;
    }
    if ('min' in threshold && value < (threshold as { min: number }).min) {
      failures.push(`Failed: ${threshold.label} (got ${(value * 100).toFixed(0)}%)`);
    }
    if ('max' in threshold && value > (threshold as { max: number }).max) {
      failures.push(`Failed: ${threshold.label} (got ${value})`);
    }
  }
  return { passes: failures.length === 0, failures };
}

describe('Launch Gate Evaluation', () => {
  it('passes when all metrics meet thresholds', () => {
    const { passes, failures } = evaluateGate({
      activationFunnelRate: 0.45,
      d7Retention: 0.3,
      researchQuality: 0.65,
      searchSuccess: 0.88,
      alertActionRate: 0.15,
      dataFreshness: 1800,
      errorRate: 0.02,
    });
    expect(passes).toBe(true);
    expect(failures).toEqual([]);
  });

  it('fails when activation funnel is below threshold', () => {
    const { passes, failures } = evaluateGate({
      activationFunnelRate: 0.2,
      d7Retention: 0.3,
      researchQuality: 0.65,
      searchSuccess: 0.88,
      alertActionRate: 0.15,
      dataFreshness: 1800,
      errorRate: 0.02,
    });
    expect(passes).toBe(false);
    expect(failures.some((f) => f.includes('Activation funnel'))).toBe(true);
  });

  it('fails when D7 retention is below threshold', () => {
    const { passes, failures } = evaluateGate({
      activationFunnelRate: 0.45,
      d7Retention: 0.1,
      researchQuality: 0.65,
      searchSuccess: 0.88,
      alertActionRate: 0.15,
      dataFreshness: 1800,
      errorRate: 0.02,
    });
    expect(passes).toBe(false);
    expect(failures.some((f) => f.includes('D7 retention'))).toBe(true);
  });

  it('fails when data freshness exceeds max', () => {
    const { passes, failures } = evaluateGate({
      activationFunnelRate: 0.45,
      d7Retention: 0.3,
      researchQuality: 0.65,
      searchSuccess: 0.88,
      alertActionRate: 0.15,
      dataFreshness: 7200,
      errorRate: 0.02,
    });
    expect(passes).toBe(false);
    expect(failures.some((f) => f.includes('data freshness'))).toBe(true);
  });

  it('reports all failures when multiple metrics fail', () => {
    const { passes, failures } = evaluateGate({
      activationFunnelRate: 0.15,
      d7Retention: 0.1,
      researchQuality: 0.65,
      searchSuccess: 0.88,
      alertActionRate: 0.15,
      dataFreshness: 7200,
      errorRate: 0.02,
    });
    expect(passes).toBe(false);
    expect(failures.length).toBeGreaterThanOrEqual(2);
  });
});
