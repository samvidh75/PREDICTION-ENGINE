import { describe, it, expect, beforeEach } from 'vitest';

describe('Analytics Tracking', () => {
  beforeEach(async () => {
    const { clearMetrics } = await import('../src/utils/analytics');
    clearMetrics();
  });

  it('Should track query metrics', async () => {
    const { trackQueryMetrics, getAggregatedMetrics } = await import('../src/utils/analytics');

    trackQueryMetrics('regex', 15, 'test query', true);
    const metrics = getAggregatedMetrics();
    expect(metrics.totalQueries).toBe(1);
  });

  it('Should aggregate metrics correctly', async () => {
    const { trackQueryMetrics, getAggregatedMetrics } = await import('../src/utils/analytics');

    trackQueryMetrics('regex', 10, 'query 1', true);
    trackQueryMetrics('transformers', 150, 'query 2', true);
    trackQueryMetrics('groq', 1500, 'query 3', true);

    const metrics = getAggregatedMetrics();
    expect(metrics.totalQueries).toBe(3);
    expect(metrics.methods.regex.count).toBe(1);
    expect(metrics.methods.transformers.count).toBe(1);
    expect(metrics.methods.groq.count).toBe(1);
  });

  it('Should calculate percentages correctly', async () => {
    const { trackQueryMetrics, getAggregatedMetrics } = await import('../src/utils/analytics');

    trackQueryMetrics('regex', 10, 'q1', true);
    trackQueryMetrics('regex', 10, 'q2', true);
    trackQueryMetrics('transformers', 150, 'q3', true);
    trackQueryMetrics('transformers', 150, 'q4', true);

    const metrics = getAggregatedMetrics();
    expect(metrics.methods.regex.percentage).toBeCloseTo(50);
    expect(metrics.methods.transformers.percentage).toBeCloseTo(50);
  });

  it('Should handle localStorage persistence', async () => {
    const { persistMetricsToLocalStorage, retrievePersistedMetrics, trackQueryMetrics } = await import('../src/utils/analytics');

    trackQueryMetrics('regex', 10, 'test', true);
    persistMetricsToLocalStorage();

    const persisted = retrievePersistedMetrics();
    expect(persisted).not.toBeNull();
    expect(persisted.totalQueries).toBeGreaterThanOrEqual(1);
  });
});
