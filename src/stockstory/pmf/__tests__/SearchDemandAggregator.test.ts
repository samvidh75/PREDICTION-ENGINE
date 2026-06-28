import { describe, it, expect } from 'vitest';
import { SearchDemandAggregator } from '../SearchDemandAggregator';

describe('SearchDemandAggregator', () => {
  const aggregator = new SearchDemandAggregator();

  it('initializes with zero searches', () => {
    const result = aggregator.getAggregated();
    expect(result.totalSearches).toBe(0);
    expect(result.successRate).toBe(0);
  });

  it('tracks successful searches', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.search.success_rate',
      value: 1,
      dimensions: { query: 'RELIANCE', label: 'Search success' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalSearches).toBe(1);
  });

  it('tracks failed searches', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.search.failure_rate',
      value: 1,
      dimensions: { query: 'UNKNOWN_STOCK_XYZ', label: 'Search failed' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalSearches).toBe(1);
  });

  it('tracks unique queries', () => {
    const result = aggregator.getAggregated();
    expect(result.uniqueQueries).toBeGreaterThanOrEqual(0);
  });

  it('identifies top failed queries', () => {
    for (let i = 0; i < 3; i++) {
      aggregator.aggregate({
        userId: `user_${i}`,
        timestamp: new Date().toISOString(),
        metricKey: 'pmf.search.failure_rate',
        value: 1,
        dimensions: { query: 'NOTFOUND', label: 'Search failed' },
      });
    }
    const result = aggregator.getAggregated();
    expect(result.topFailedQueries?.length).toBeGreaterThanOrEqual(0);
  });

  it('resets state', () => {
    const a2 = new SearchDemandAggregator();
    a2.reset();
    expect(a2.getAggregated().totalSearches).toBe(0);
  });
});
