import { describe, it, expect } from 'vitest';
import { FunnelAggregator } from '../FunnelAggregator';
import { ProductEventStore } from '../ProductEventStore';
import { PmfMetricRegistry } from '../PmfMetricRegistry';
import type { NormalizedMetricEvent } from '../ProductEventNormalizer';

function signupEvent(userId: string): NormalizedMetricEvent {
  return {
    metricKey: PmfMetricRegistry.ACTIVATION_SIGNUP.key,
    value: 1,
    userId,
    timestamp: new Date().toISOString(),
    dimensions: {},
  };
}

function searchEvent(userId: string): NormalizedMetricEvent {
  return {
    metricKey: PmfMetricRegistry.ACTIVATION_FIRST_SEARCH.key,
    value: 1,
    userId,
    timestamp: new Date().toISOString(),
    dimensions: {},
  };
}

function stockViewEvent(userId: string): NormalizedMetricEvent {
  return {
    metricKey: PmfMetricRegistry.ACTIVATION_FIRST_STOCK_VIEW.key,
    value: 1,
    userId,
    timestamp: new Date().toISOString(),
    dimensions: {},
  };
}

function watchlistEvent(userId: string): NormalizedMetricEvent {
  return {
    metricKey: PmfMetricRegistry.ACTIVATION_FIRST_WATCHLIST.key,
    value: 1,
    userId,
    timestamp: new Date().toISOString(),
    dimensions: {},
  };
}

describe('FunnelAggregator', () => {
  it('returns zeroed funnel from empty store', async () => {
    const store = new ProductEventStore();
    const aggregator = new FunnelAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.steps).toHaveLength(5);
    for (const step of result.steps) {
      expect(step.uniqueUsers).toBe(0);
    }
    expect(result.overallConversion).toBeNull();
  });

  it('tracks activation funnel correctly for one user', async () => {
    const store = new ProductEventStore();
    store.store(signupEvent('user_1'));
    store.store(searchEvent('user_1'));
    store.store(stockViewEvent('user_1'));
    store.store(watchlistEvent('user_1'));

    const aggregator = new FunnelAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.steps[0].uniqueUsers).toBe(1); // sign-up
    expect(result.steps[1].uniqueUsers).toBe(1); // first search
    expect(result.steps[2].uniqueUsers).toBe(1); // stock view
    expect(result.steps[3].uniqueUsers).toBe(1); // watchlist
  });

  it('calculates conversion rates between steps', async () => {
    const store = new ProductEventStore();
    store.store(signupEvent('user_1'));
    store.store(searchEvent('user_1'));
    store.store(stockViewEvent('user_1'));
    store.store(signupEvent('user_2'));
    store.store(searchEvent('user_2'));
    store.store(signupEvent('user_3'));

    const aggregator = new FunnelAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.steps[0].uniqueUsers).toBe(3); // 3 signed up
    expect(result.steps[1].uniqueUsers).toBe(2); // 2 searched
    expect(result.steps[1].conversionFromPrevious).toBe(67); // 2/3 ≈ 67%
    expect(result.steps[2].uniqueUsers).toBe(1); // 1 viewed stock
    expect(result.steps[2].conversionFromPrevious).toBe(50); // 1/2 = 50%
  });

  it('handles multiple users with partial progress', async () => {
    const store = new ProductEventStore();
    store.store(signupEvent('user_1'));
    store.store(searchEvent('user_1'));
    store.store(stockViewEvent('user_1'));
    store.store(signupEvent('user_2'));
    store.store(signupEvent('user_3'));
    store.store(searchEvent('user_3'));

    const aggregator = new FunnelAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.steps[0].uniqueUsers).toBe(3);
    expect(result.steps[1].uniqueUsers).toBe(2);
    expect(result.steps[2].uniqueUsers).toBe(1);
  });
});
