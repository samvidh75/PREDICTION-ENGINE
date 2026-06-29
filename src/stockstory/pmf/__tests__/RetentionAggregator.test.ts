import { describe, it, expect } from 'vitest';
import { RetentionAggregator } from '../RetentionAggregator';
import { ProductEventStore } from '../ProductEventStore';
import type { NormalizedMetricEvent } from '../ProductEventNormalizer';

function signupEvent(userId: string, daysAgo: number): NormalizedMetricEvent {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    metricKey: 'pmf.activation.signup',
    value: 1,
    userId,
    timestamp: d.toISOString(),
    dimensions: {},
  };
}

function sessionEvent(userId: string, daysAgo: number): NormalizedMetricEvent {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    metricKey: 'pmf.retention.wau',
    value: 1,
    userId,
    timestamp: d.toISOString(),
    dimensions: {},
  };
}

describe('RetentionAggregator', () => {
  it('returns null retention values from empty store', async () => {
    const store = new ProductEventStore();
    const aggregator = new RetentionAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.overall).toBeDefined();
    expect(result.overall.d1).toBeNull();
    expect(result.overall.d7).toBeNull();
    expect(result.overall.d30).toBeNull();
    expect(result.cohorts).toHaveLength(0);
  });

  it('calculates D1 retention for a returning user', async () => {
    const store = new ProductEventStore();
    // User signs up 1 day ago
    store.store(signupEvent('user_1', 1));
    // User returns today (D1)
    store.store(sessionEvent('user_1', 0));

    const aggregator = new RetentionAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.cohorts.length).toBeGreaterThanOrEqual(1);
    expect(result.overall.d1).toBeGreaterThan(0);
  });

  it('handles multiple users with different return patterns', async () => {
    const store = new ProductEventStore();
    // user_1 signs up and returns D1
    store.store(signupEvent('user_1', 1));
    store.store(sessionEvent('user_1', 0));
    // user_2 signs up but doesn't return
    store.store(signupEvent('user_2', 1));
    // user_3 signs up and returns D1
    store.store(signupEvent('user_3', 1));
    store.store(sessionEvent('user_3', 0));

    const aggregator = new RetentionAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.cohorts.length).toBeGreaterThanOrEqual(1);
    // 2 out of 3 returned = 67%
    expect(result.overall.d1).toBe(67);
  });

  it('reports 0% retention when no users return', async () => {
    const store = new ProductEventStore();
    store.store(signupEvent('user_1', 1));
    store.store(signupEvent('user_2', 1));

    const aggregator = new RetentionAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.overall.d1).toBe(0);
  });
});
