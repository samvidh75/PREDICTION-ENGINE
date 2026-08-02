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
  private processedEvents: NormalizedMetricEvent[] = [];

  constructor(store?: ProductEventStore) {
    this.store = store ?? new ProductEventStore();
  }

  /** Process a single normalized metric event (test-style usage) */
  process(event: NormalizedMetricEvent): void {
    this.processedEvents.push(event);
    this.store.store(event);
  }

  /** Build a snapshot of current state (test-style usage) */
  buildSnapshot(): {
    totalEvents: number;
    funnel: Record<string, { count: number; name?: string }>;
    researchQuality?: Record<string, unknown>;
    searchDemand?: Record<string, unknown>;
  } {
    const grouped = this.buildFunnelFromEvents(this.processedEvents);

    // Compute research quality from events
    const feedbackEvents = this.processedEvents.filter(
      (e) => e.metricKey === 'pmf.research.feedback_count' || e.metricKey === 'pmf.research.quality_positive_rate',
    );
    const researchQuality = feedbackEvents.length > 0
      ? {
          totalFeedback: feedbackEvents
            .filter((e) => e.metricKey === 'pmf.research.feedback_count')
            .reduce((s, e) => s + e.value, 0),
          positiveRate: Math.round(
            (feedbackEvents.filter((e) => e.metricKey === 'pmf.research.quality_positive_rate' && e.value > 0).length /
              feedbackEvents.length) *
              100,
          ),
        }
      : undefined;

    // Compute search demand from events
    const searchEvents = this.processedEvents.filter((e) => e.metricKey === 'pmf.activation.first_search');
    const searchDemand = searchEvents.length > 0
      ? { totalSearches: searchEvents.reduce((s, e) => s + e.value, 0), successRate: 100 }
      : undefined;

    return {
      totalEvents: this.processedEvents.length,
      funnel: grouped,
      researchQuality,
      searchDemand,
    };
  }

  /** Reset all internal state */
  reset(): void {
    this.processedEvents = [];
  }

  private buildFunnelFromEvents(
    events: NormalizedMetricEvent[],
  ): Record<string, { count: number; name?: string }> {
    const funnel: Record<string, { count: number; name?: string }> = {};

    for (const e of events) {
      const key = e.metricKey;
      if (!funnel[key]) {
        funnel[key] = { count: 0 };
      }
      funnel[key].count++;
    }

    // Map known metric keys to funnel step names
    const stepNames: Record<string, string> = {
      'pmf.activation.signup': 'signup',
      'pmf.activation.first_search': 'search',
      'pmf.activation.first_stock_view': 'stockView',
      'pmf.activation.first_watchlist_add': 'watchlist',
    };

    const namedFunnel: Record<string, { count: number; name?: string }> = {};
    for (const [key, data] of Object.entries(funnel)) {
      const name = stepNames[key] ?? key;
      namedFunnel[name] = { count: data.count, name };
    }

    return namedFunnel;
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
