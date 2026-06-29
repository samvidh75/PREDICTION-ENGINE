/**
 * SearchDemandAggregator — Tracks search demand signals for content gap analysis.
 *
 * Analyzes:
 *  - Search volume over time
 *  - Success vs failed search rates
 *  - Most common failed queries (content gaps)
 *  - Top searched symbols
 *  - Search volume by sector/topic
 */

import type { AggregatorContext, PmfSubAggregator } from './PmfAggregationService';

export interface SearchDemandReport {
  periodStart: string;
  periodEnd: string;
  totalSearches: number;
  successfulSearches: number;
  failedSearches: number;
  successRate: number;
  topQueries: Array<{ query: string; count: number }>;
  topFailedQueries: Array<{ query: string; count: number }>;
  topSymbols: Array<{ symbol: string; count: number }>;
  dailyTrend: Array<{ date: string; total: number; successRate: number }>;
}

export class SearchDemandAggregator implements PmfSubAggregator {
  name = 'searchDemand';

  private options: { minCount: number };

  constructor(options: { minCount: number }) {
    this.options = options;
  }

  getAggregated(): SearchDemandReport {
    return {
      periodStart: '',
      periodEnd: '',
      totalSearches: 0,
      successfulSearches: 0,
      failedSearches: 0,
      successRate: 0,
      topQueries: [],
      topFailedQueries: [],
      topSymbols: [],
      dailyTrend: [],
    };
  }

  async aggregate(ctx: AggregatorContext): Promise<SearchDemandReport> {
    const searchEvents = ctx.store.queryByMetricKey('pmf.activation.first_search', 5000);
    const failedEvents = ctx.store.queryByMetricKey('pmf.search.demand_empty_results', 5000);

    const queryCounts = new Map<string, number>();
    const failedQueryCounts = new Map<string, number>();
    const symbolCounts = new Map<string, number>();
    const dailyBuckets = new Map<string, { total: number; failed: number }>();

    for (const event of searchEvents) {
      const query = event.dimensions?.label ?? 'unknown';
      queryCounts.set(query, (queryCounts.get(query) ?? 0) + event.value);

      const symbol = event.dimensions?.symbol ?? '';
      if (symbol) {
        symbolCounts.set(symbol, (symbolCounts.get(symbol) ?? 0) + event.value);
      }

      const date = event.timestamp.slice(0, 10);
      if (!dailyBuckets.has(date)) dailyBuckets.set(date, { total: 0, failed: 0 });
      dailyBuckets.get(date)!.total += event.value;
    }

    for (const event of failedEvents) {
      const query = event.dimensions?.label ?? 'unknown';
      failedQueryCounts.set(query, (failedQueryCounts.get(query) ?? 0) + event.value);

      const date = event.timestamp.slice(0, 10);
      if (!dailyBuckets.has(date)) dailyBuckets.set(date, { total: 0, failed: 0 });
      dailyBuckets.get(date)!.failed += event.value;
    }

    const totalSearches = Array.from(queryCounts.values()).reduce((a, b) => a + b, 0);
    const totalFailed = Array.from(failedQueryCounts.values()).reduce((a, b) => a + b, 0);
    const successfulSearches = totalSearches;

    const sortByCount = (map: Map<string, number>, n: number) =>
      Array.from(map.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, n)
        .map(([query, count]) => ({ query, count }));

    const dailyTrend = Array.from(dailyBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, data]) => ({
        date,
        total: data.total,
        successRate: data.total > 0
          ? Math.round(((data.total - data.failed) / data.total) * 100)
          : 100,
      }));

    return {
      periodStart: ctx.periodStart,
      periodEnd: ctx.periodEnd,
      totalSearches,
      successfulSearches,
      failedSearches: totalFailed,
      successRate: totalSearches > 0
        ? Math.round(((totalSearches - totalFailed) / totalSearches) * 100)
        : 100,
      topQueries: sortByCount(queryCounts, 20),
      topFailedQueries: sortByCount(failedQueryCounts, 20),
      topSymbols: sortByCount(symbolCounts, 20),
      dailyTrend,
    };
  }
}
