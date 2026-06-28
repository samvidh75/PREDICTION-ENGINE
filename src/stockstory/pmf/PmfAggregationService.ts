/**
 * PmfAggregationService — Coordinates PMF metric aggregation across all sub-aggregators.
 *
 * Pulls NormalizedMetricEvents from ProductEventStore, routes to appropriate
 * sub-aggregators (FunnelAggregator, RetentionAggregator, etc.),
 * and produces a consolidated PMF snapshot.
 */

import type { NormalizedMetricEvent } from './ProductEventNormalizer';
import { PmfMetricRegistry } from './PmfMetricRegistry';
import type { MetricDef } from './PmfMetricRegistry';
import { ProductEventStore } from './ProductEventStore';

export interface PmfSnapshot {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  metrics: PmfMetricValue[];
  funnel: PmfFunnelStep[];
  aggregatorResults: Record<string, unknown>;
}

export interface PmfMetricValue {
  key: string;
  label: string;
  value: number;
  unit: string;
  category: string;
}

export interface PmfFunnelStep {
  name: string;
  metricKey: string;
  count: number;
  conversionFromPrevious: number | null;
}

export interface AggregatorContext {
  store: ProductEventStore;
  periodStart: string;
  periodEnd: string;
}

export interface PmfSubAggregator {
  name: string;
  aggregate(ctx: AggregatorContext): Promise<Record<string, unknown>>;
}

export class PmfAggregationService {
  private aggregators: Map<string, PmfSubAggregator> = new Map();
  private store: ProductEventStore;

  constructor(store: ProductEventStore) {
    this.store = store;
  }

  registerAggregator(agg: PmfSubAggregator): void {
    this.aggregators.set(agg.name, agg);
  }

  getRegisteredAggregators(): string[] {
    return Array.from(this.aggregators.keys());
  }

  async generateSnapshot(opts: {
    periodStart: string;
    periodEnd: string;
  }): Promise<PmfSnapshot> {
    const ctx: AggregatorContext = {
      store: this.store,
      periodStart: opts.periodStart,
      periodEnd: opts.periodEnd,
    };

    // Collect standard metric values
    const metrics: PmfMetricValue[] = [];

    for (const def of PmfMetricRegistry.getAll()) {
      const events = this.store.queryByMetricKey(def.key, 1000);
      // Simple aggregation: for counters sum values, for gauges latest
      let value = 0;
      if (def.kind === 'counter' || def.kind === 'gauge') {
        value = events.reduce((sum, e) => sum + e.value, 0);
      } else if (def.kind === 'histogram') {
        value = events.length > 0
          ? Math.round(events.reduce((sum, e) => sum + e.value, 0) / events.length)
          : 0;
      } else if (def.kind === 'ratio') {
        value = events.length > 0
          ? Math.round((events.filter((e) => e.value > 0).length / events.length) * 100)
          : 0;
      }

      metrics.push({
        key: def.key,
        label: def.label,
        value,
        unit: def.unit,
        category: def.category,
      });
    }

    // Build activation funnel
    const funnel = this.buildFunnel(metrics);

    // Run sub-aggregators
    const aggregatorResults: Record<string, unknown> = {};
    for (const [name, agg] of this.aggregators) {
      try {
        aggregatorResults[name] = await agg.aggregate(ctx);
      } catch (err) {
        aggregatorResults[name] = {
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      periodStart: opts.periodStart,
      periodEnd: opts.periodEnd,
      metrics,
      funnel,
      aggregatorResults,
    };
  }

  private buildFunnel(metrics: PmfMetricValue[]): PmfFunnelStep[] {
    const signups = this.findMetric(metrics, PmfMetricRegistry.ACTIVATION_SIGNUP.key)?.value ?? 0;
    const searches = this.findMetric(metrics, PmfMetricRegistry.ACTIVATION_FIRST_SEARCH.key)?.value ?? 0;
    const stockViews = this.findMetric(metrics, PmfMetricRegistry.ACTIVATION_FIRST_STOCK_VIEW.key)?.value ?? 0;
    const watchlist = this.findMetric(metrics, PmfMetricRegistry.ACTIVATION_FIRST_WATCHLIST.key)?.value ?? 0;

    return [
      { name: 'Sign-ups', metricKey: PmfMetricRegistry.ACTIVATION_SIGNUP.key, count: signups, conversionFromPrevious: null },
      { name: 'First Search', metricKey: PmfMetricRegistry.ACTIVATION_FIRST_SEARCH.key, count: searches, conversionFromPrevious: signups > 0 ? Math.round((searches / signups) * 100) : 0 },
      { name: 'First Stock View', metricKey: PmfMetricRegistry.ACTIVATION_FIRST_STOCK_VIEW.key, count: stockViews, conversionFromPrevious: searches > 0 ? Math.round((stockViews / searches) * 100) : 0 },
      { name: 'Watchlist Added', metricKey: PmfMetricRegistry.ACTIVATION_FIRST_WATCHLIST.key, count: watchlist, conversionFromPrevious: stockViews > 0 ? Math.round((watchlist / stockViews) * 100) : 0 },
    ];
  }

  private findMetric(metrics: PmfMetricValue[], key: string): PmfMetricValue | undefined {
    return metrics.find((m) => m.key === key);
  }
}
