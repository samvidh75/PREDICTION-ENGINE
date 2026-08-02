import { describe, it, expect } from 'vitest';
import { SearchDemandAggregator } from '../SearchDemandAggregator';
import { ProductEventStore } from '../ProductEventStore';
import type { NormalizedMetricEvent } from '../ProductEventNormalizer';

function makeEvent(overrides: Partial<NormalizedMetricEvent>): NormalizedMetricEvent {
  return {
    metricKey: 'pmf.activation.first_search',
    value: 1,
    userId: 'user_1',
    timestamp: new Date().toISOString(),
    dimensions: {},
    ...overrides,
  };
}

describe('SearchDemandAggregator', () => {
  it('reports zero searches from empty store', async () => {
    const store = new ProductEventStore();
    const aggregator = new SearchDemandAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.totalSearches).toBe(0);
    expect(result.successRate).toBe(100);
  });

  it('counts successful searches from events in store', async () => {
    const store = new ProductEventStore();
    store.store(makeEvent({ metricKey: 'pmf.activation.first_search', value: 1 }));

    const aggregator = new SearchDemandAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.totalSearches).toBe(1);
  });

  it('reports failed and successful searches', async () => {
    const store = new ProductEventStore();
    store.store(makeEvent({ metricKey: 'pmf.activation.first_search', value: 1 }));
    store.store(makeEvent({ metricKey: 'pmf.search.demand_empty_results', value: 1, dimensions: { label: 'NOTFOUND' } }));

    const aggregator = new SearchDemandAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.totalSearches).toBe(1);
    expect(result.failedSearches).toBe(1);
    expect(result.successRate).toBe(0);
  });

  it('identifies top queries', async () => {
    const store = new ProductEventStore();
    store.store(makeEvent({ userId: 'user_1', metricKey: 'pmf.activation.first_search', value: 1, dimensions: { label: 'RELIANCE' } }));
    store.store(makeEvent({ userId: 'user_2', metricKey: 'pmf.activation.first_search', value: 1, dimensions: { label: 'TCS' } }));
    store.store(makeEvent({ userId: 'user_3', metricKey: 'pmf.activation.first_search', value: 1, dimensions: { label: 'RELIANCE' } }));

    const aggregator = new SearchDemandAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    const reliance = result.topQueries.find((q) => q.query === 'RELIANCE');
    expect(reliance).toBeDefined();
    expect(reliance!.count).toBe(2);
  });

  it('identifies top failed queries', async () => {
    const store = new ProductEventStore();
    for (let i = 0; i < 3; i++) {
      store.store(makeEvent({
        userId: `user_${i}`,
        metricKey: 'pmf.search.demand_empty_results',
        value: 1,
        dimensions: { label: 'NOTFOUND' },
      }));
    }

    const aggregator = new SearchDemandAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.topFailedQueries.length).toBeGreaterThanOrEqual(1);
    const nf = result.topFailedQueries.find((q) => q.query === 'NOTFOUND');
    expect(nf).toBeDefined();
    expect(nf!.count).toBe(3);
  });

  it('produces daily trend', async () => {
    const store = new ProductEventStore();
    store.store(makeEvent({ metricKey: 'pmf.activation.first_search', value: 1 }));

    const aggregator = new SearchDemandAggregator();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.dailyTrend.length).toBeGreaterThanOrEqual(1);
    expect(result.dailyTrend[0].total).toBe(1);
  });
});
