/**
 * ScenarioUsefulnessAnalytics — Tracks scenario page engagement and usefulness.
 *
 * Metrics:
 *  - Scenario views / completions
 *  - Scenario comparison usage
 *  - Scenario save/bookmark rate
 *  - Top scenarios by engagement
 *  - Scenario type distribution
 *  - Scenario share rate
 */

import type { AggregatorContext, PmfSubAggregator } from './PmfAggregationService';

export interface ScenarioUsefulnessReport {
  periodStart: string;
  periodEnd: string;
  totalViews: number;
  totalCompletions: number;
  totalSaves: number;
  totalShares: number;
  totalComparisons: number;
  completionRate: number;
  saveRate: number;
  byType: Record<string, { views: number; saves: number }>;
  topScenarios: Array<{ name: string; views: number; saves: number }>;
  dailyTrend: Array<{ date: string; views: number; saves: number }>;
}

export class ScenarioUsefulnessAnalytics implements PmfSubAggregator {
  name = 'scenarioUsefulness';

  // Internal state for sync test-style usage
  private state: {
    totalViews: number;
    totalCompletions: number;
    totalSaves: number;
    totalShares: number;
    totalComparisons: number;
  } = {
    totalViews: 0,
    totalCompletions: 0,
    totalSaves: 0,
    totalShares: 0,
    totalComparisons: 0,
  };

  /**
   * Sync aggregate for direct event recording (test-style usage).
   */
  aggregate(event: {
    userId?: string;
    timestamp: string;
    metricKey: string;
    value: number;
    dimensions?: Record<string, string>;
  }): void;
  /**
   * Async aggregate for PmfSubAggregator interface (store-based).
   */
  aggregate(ctx: AggregatorContext): Promise<ScenarioUsefulnessReport>;
  async aggregate(
    input: AggregatorContext | {
      userId?: string;
      timestamp: string;
      metricKey: string;
      value: number;
      dimensions?: Record<string, string>;
    },
  ): Promise<ScenarioUsefulnessReport | void> {
    if ('store' in input && 'periodStart' in input) {
      return this.aggregateFromStore(input);
    }

    const event = input as {
      userId?: string;
      timestamp: string;
      metricKey: string;
      value: number;
      dimensions?: Record<string, string>;
    };

    switch (event.metricKey) {
      case 'pmf.scenario.view_rate':
        this.state.totalViews += event.value;
        break;
      case 'pmf.scenario.completion_rate':
        this.state.totalCompletions += event.value;
        break;
      case 'pmf.scenario.save_rate':
        this.state.totalSaves += event.value;
        break;
      case 'pmf.scenario.share_rate':
        this.state.totalShares += event.value;
        break;
    }
  }

  /** Returns current aggregated results (sync, for tests) */
  getAggregated(): Record<string, number> {
    return { ...this.state };
  }

  /** Resets internal state */
  reset(): void {
    this.state = {
      totalViews: 0,
      totalCompletions: 0,
      totalSaves: 0,
      totalShares: 0,
      totalComparisons: 0,
    };
  }

  private async aggregateFromStore(ctx: AggregatorContext): Promise<ScenarioUsefulnessReport> {
    const viewEvents = ctx.store.queryByMetricKey('pmf.engagement.scenario_views', 5000);
    const saveEvents = ctx.store.queryByMetricKey('pmf.engagement.scenario_saves', 5000);
    const shareEvents = ctx.store.queryByMetricKey('pmf.engagement.scenario_shares', 5000);
    const comparisonEvents = ctx.store.queryByMetricKey('pmf.engagement.scenario_comparisons', 5000);
    const completionEvents = ctx.store.queryByMetricKey('pmf.engagement.scenario_completions', 5000);

    const byType: Record<string, { views: number; saves: number }> = {};
    const scenarioBuckets = new Map<string, { views: number; saves: number }>();
    const dailyBuckets = new Map<string, { views: number; saves: number }>();

    for (const event of viewEvents) {
      const type = event.dimensions?.type ?? 'unknown';
      if (!byType[type]) byType[type] = { views: 0, saves: 0 };
      byType[type].views += event.value;

      const name = event.dimensions?.label ?? event.dimensions?.scenario ?? 'unknown';
      if (!scenarioBuckets.has(name)) scenarioBuckets.set(name, { views: 0, saves: 0 });
      scenarioBuckets.get(name)!.views += event.value;

      const date = event.timestamp.slice(0, 10);
      if (!dailyBuckets.has(date)) dailyBuckets.set(date, { views: 0, saves: 0 });
      dailyBuckets.get(date)!.views += event.value;
    }

    for (const event of saveEvents) {
      const type = event.dimensions?.type ?? 'unknown';
      if (!byType[type]) byType[type] = { views: 0, saves: 0 };
      byType[type].saves += event.value;

      const name = event.dimensions?.label ?? event.dimensions?.scenario ?? 'unknown';
      if (!scenarioBuckets.has(name)) scenarioBuckets.set(name, { views: 0, saves: 0 });
      scenarioBuckets.get(name)!.saves += event.value;

      const date = event.timestamp.slice(0, 10);
      if (!dailyBuckets.has(date)) dailyBuckets.set(date, { views: 0, saves: 0 });
      dailyBuckets.get(date)!.saves += event.value;
    }

    const totalViews = viewEvents.reduce((a, e) => a + e.value, 0);
    const totalSaves = saveEvents.reduce((a, e) => a + e.value, 0);
    const totalShares = shareEvents.reduce((a, e) => a + e.value, 0);
    const totalComparisons = comparisonEvents.reduce((a, e) => a + e.value, 0);
    const totalCompletions = completionEvents.reduce((a, e) => a + e.value, 0);

    const topScenarios = Array.from(scenarioBuckets.entries())
      .map(([name, data]) => ({ name, views: data.views, saves: data.saves }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const dailyTrend = Array.from(dailyBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, data]) => ({ date, views: data.views, saves: data.saves }));

    return {
      periodStart: ctx.periodStart,
      periodEnd: ctx.periodEnd,
      totalViews,
      totalCompletions,
      totalSaves,
      totalShares,
      totalComparisons,
      completionRate: totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0,
      saveRate: totalViews > 0 ? Math.round((totalSaves / totalViews) * 100) : 0,
      byType,
      topScenarios,
      dailyTrend,
    };
  }
}
