/**
 * ResearchQualityAggregator — Aggregates research quality feedback signals.
 *
 * Tracks:
 *  - Positive feedback rate (useful / total)
 *  - Feedback volume by component (thesis, bullCase, bearCase, risks, etc.)
 *  - Feedback volume by symbol
 *  - Trend over time (weekly buckets)
 */

import type { AggregatorContext, PmfSubAggregator } from './PmfAggregationService';

export interface ResearchQualityReport {
  periodStart: string;
  periodEnd: string;
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number;
  byComponent: Record<string, { total: number; positive: number; rate: number }>;
  bySymbol: Record<string, { total: number; positive: number }>;
  weeklyTrend: Array<{ week: string; total: number; positiveRate: number }>;
  topIssues: string[];
}

export class ResearchQualityAggregator implements PmfSubAggregator {
  name = 'researchQuality';

  async aggregate(ctx: AggregatorContext): Promise<ResearchQualityReport> {
    const feedbackEvents = ctx.store.queryByMetricKey('pmf.research.feedback_count', 5000);
    const qualityEvents = ctx.store.queryByMetricKey('pmf.research.quality_positive_rate', 5000);

    const byComponent: Record<string, { total: number; positive: number; rate: number }> = {};
    const bySymbol: Record<string, { total: number; positive: number }> = {};
    const weeklyBuckets = new Map<string, { total: number; positive: number }>();
    const issues: string[] = [];

    let totalFeedback = 0;
    let positiveCount = 0;

    for (const event of feedbackEvents) {
      totalFeedback += event.value;
    }

    for (const event of qualityEvents) {
      if (event.value > 0) positiveCount++;

      const component = event.dimensions?.component ?? 'unknown';
      const symbol = event.dimensions?.symbol ?? 'unknown';
      const week = event.timestamp.slice(0, 10); // Use date as proxy

      if (!byComponent[component]) byComponent[component] = { total: 0, positive: 0, rate: 0 };
      byComponent[component].total++;
      byComponent[component].positive += event.value > 0 ? 1 : 0;

      if (!bySymbol[symbol]) bySymbol[symbol] = { total: 0, positive: 0 };
      bySymbol[symbol].total++;
      if (event.value > 0) bySymbol[symbol].positive++;

      if (!weeklyBuckets.has(week)) weeklyBuckets.set(week, { total: 0, positive: 0 });
      weeklyBuckets.get(week)!.total++;
      if (event.value > 0) weeklyBuckets.get(week)!.positive++;
    }

    // Calculate rates
    for (const comp of Object.keys(byComponent)) {
      const c = byComponent[comp];
      c.rate = c.total > 0 ? Math.round((c.positive / c.total) * 100) : 0;
    }

    // Find symbols with high negative feedback
    for (const [sym, data] of Object.entries(bySymbol)) {
      const negRate = data.total > 0 && data.positive / data.total < 0.3;
      if (negRate && data.total >= 3) {
        issues.push(`Symbol ${sym} has low quality rating (${Math.round((data.positive / data.total) * 100)}% positive)`);
      }
    }

    const weeklyTrend = Array.from(weeklyBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, data]) => ({
        week,
        total: data.total,
        positiveRate: data.total > 0 ? Math.round((data.positive / data.total) * 100) : 0,
      }));

    const negativeCount = totalFeedback - positiveCount;
    const positiveRate = totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : 0;

    return {
      periodStart: ctx.periodStart,
      periodEnd: ctx.periodEnd,
      totalFeedback,
      positiveCount,
      negativeCount,
      positiveRate,
      byComponent,
      bySymbol: this.topSymbols(bySymbol, 20),
      weeklyTrend,
      topIssues: issues.slice(0, 10),
    };
  }

  private topSymbols(
    bySymbol: Record<string, { total: number; positive: number }>,
    n: number,
  ): Record<string, { total: number; positive: number }> {
    return Object.entries(bySymbol)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, n)
      .reduce((acc, [sym, data]) => {
        acc[sym] = data;
        return acc;
      }, {} as Record<string, { total: number; positive: number }>);
  }
}
