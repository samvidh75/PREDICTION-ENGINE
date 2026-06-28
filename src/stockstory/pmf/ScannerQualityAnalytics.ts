/**
 * ScannerQualityAnalytics — Tracks scanner quality and engagement.
 *
 * Metrics:
 *  - Scanner views / interactions
 *  - Alert-to-action conversion (scanner → detail view)
 *  - Top performing scanners
 *  - Scanner dismissals / ignored alerts
 *  - Time spent on scanner results
 */

import type { AggregatorContext, PmfSubAggregator } from './PmfAggregationService';

export interface ScannerQualityReport {
  periodStart: string;
  periodEnd: string;
  totalViews: number;
  totalInteractions: number;
  totalDismissals: number;
  interactionRate: number;
  topScanners: Array<{ scanner: string; views: number; interactions: number }>;
  dailyTrend: Array<{ date: string; views: number; interactions: number }>;
}

export class ScannerQualityAnalytics implements PmfSubAggregator {
  name = 'scannerQuality';

  async aggregate(ctx: AggregatorContext): Promise<ScannerQualityReport> {
    const viewEvents = ctx.store.queryByMetricKey('pmf.engagement.scanner_views', 5000);
    const actionEvents = ctx.store.queryByMetricKey('pmf.engagement.scanner_actions', 5000);
    const dismissEvents = ctx.store.queryByMetricKey('pmf.engagement.alerts_dismissed', 5000);

    const scannerBuckets = new Map<string, { views: number; interactions: number }>();
    const dailyBuckets = new Map<string, { views: number; interactions: number }>();

    for (const event of viewEvents) {
      const scanner = event.dimensions?.scanner ?? 'unknown';
      if (!scannerBuckets.has(scanner)) scannerBuckets.set(scanner, { views: 0, interactions: 0 });
      scannerBuckets.get(scanner)!.views += event.value;

      const date = event.timestamp.slice(0, 10);
      if (!dailyBuckets.has(date)) dailyBuckets.set(date, { views: 0, interactions: 0 });
      dailyBuckets.get(date)!.views += event.value;
    }

    for (const event of actionEvents) {
      const scanner = event.dimensions?.scanner ?? 'unknown';
      if (!scannerBuckets.has(scanner)) scannerBuckets.set(scanner, { views: 0, interactions: 0 });
      scannerBuckets.get(scanner)!.interactions += event.value;

      const date = event.timestamp.slice(0, 10);
      if (!dailyBuckets.has(date)) dailyBuckets.set(date, { views: 0, interactions: 0 });
      dailyBuckets.get(date)!.interactions += event.value;
    }

    const totalViews = Array.from(scannerBuckets.values()).reduce((a, b) => a + b.views, 0);
    const totalInteractions = Array.from(scannerBuckets.values()).reduce((a, b) => a + b.interactions, 0);
    const totalDismissals = dismissEvents.reduce((a, e) => a + e.value, 0);

    const topScanners = Array.from(scannerBuckets.entries())
      .map(([scanner, data]) => ({ scanner, views: data.views, interactions: data.interactions }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const dailyTrend = Array.from(dailyBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, data]) => ({
        date,
        views: data.views,
        interactions: data.interactions,
      }));

    return {
      periodStart: ctx.periodStart,
      periodEnd: ctx.periodEnd,
      totalViews,
      totalInteractions,
      totalDismissals,
      interactionRate: totalViews > 0 ? Math.round((totalInteractions / totalViews) * 100) : 0,
      topScanners,
      dailyTrend,
    };
  }
}
