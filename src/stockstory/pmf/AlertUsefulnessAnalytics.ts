/**
 * AlertUsefulnessAnalytics — Tracks alert usefulness and engagement.
 *
 * Metrics:
 *  - Alerts delivered vs read vs acted upon
 *  - Alert-to-action conversion funnel
 *  - Alert category performance
 *  - Snoozed/dismissed rates
 *  - Time-to-action for alerts
 *  - Top alert triggers
 */

import type { AggregatorContext, PmfSubAggregator } from './PmfAggregationService';

export interface AlertUsefulnessReport {
  periodStart: string;
  periodEnd: string;
  totalAlerts: number;
  alertsRead: number;
  alertsDismissed: number;
  alertsActioned: number;
  alertsSnoozed: number;
  readRate: number;
  actionRate: number;
  byCategory: Record<string, { delivered: number; read: number; actioned: number }>;
  topTriggers: Array<{ trigger: string; count: number }>;
  dailyTrend: Array<{ date: string; delivered: number; actioned: number }>;
}

export class AlertUsefulnessAnalytics implements PmfSubAggregator {
  name = 'alertUsefulness';

  async aggregate(ctx: AggregatorContext): Promise<AlertUsefulnessReport> {
    const deliveredEvents = ctx.store.queryByMetricKey('pmf.engagement.alerts_viewed', 5000);
    const readEvents = ctx.store.queryByMetricKey('pmf.engagement.alerts_clicked', 5000);
    const dismissedEvents = ctx.store.queryByMetricKey('pmf.engagement.alerts_dismissed', 5000);
    const actionEvents = ctx.store.queryByMetricKey('pmf.engagement.alerts_set_price', 5000);
    const snoozedEvents = ctx.store.queryByMetricKey('pmf.engagement.alerts_snoozed', 5000);

    const byCategory: Record<string, { delivered: number; read: number; actioned: number }> = {};
    const triggerCounts = new Map<string, number>();
    const dailyBuckets = new Map<string, { delivered: number; actioned: number }>();

    const countPerCategory = (events: { value: number; dimensions?: Record<string, string> }[], from: 'delivered' | 'read' | 'actioned') => {
      for (const event of events) {
        const category = event.dimensions?.category ?? 'uncategorized';
        if (!byCategory[category]) byCategory[category] = { delivered: 0, read: 0, actioned: 0 };
        byCategory[category][from] += event.value;
      }
    };

    countPerCategory(deliveredEvents, 'delivered');
    countPerCategory(readEvents, 'read');
    countPerCategory(actionEvents, 'actioned');

    for (const event of deliveredEvents) {
      const trigger = event.dimensions?.trigger ?? event.dimensions?.label ?? 'unknown';
      triggerCounts.set(trigger, (triggerCounts.get(trigger) ?? 0) + event.value);

      const date = event.timestamp.slice(0, 10);
      if (!dailyBuckets.has(date)) dailyBuckets.set(date, { delivered: 0, actioned: 0 });
      dailyBuckets.get(date)!.delivered += event.value;
    }

    for (const event of actionEvents) {
      const date = event.timestamp.slice(0, 10);
      if (!dailyBuckets.has(date)) dailyBuckets.set(date, { delivered: 0, actioned: 0 });
      dailyBuckets.get(date)!.actioned += event.value;
    }

    const totalAlerts = deliveredEvents.reduce((a, e) => a + e.value, 0);
    const alertsRead = readEvents.reduce((a, e) => a + e.value, 0);
    const alertsDismissed = dismissedEvents.reduce((a, e) => a + e.value, 0);
    const alertsActioned = actionEvents.reduce((a, e) => a + e.value, 0);
    const alertsSnoozed = snoozedEvents.reduce((a, e) => a + e.value, 0);

    const topTriggers = Array.from(triggerCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([trigger, count]) => ({ trigger, count }));

    const dailyTrend = Array.from(dailyBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, data]) => ({ date, delivered: data.delivered, actioned: data.actioned }));

    return {
      periodStart: ctx.periodStart,
      periodEnd: ctx.periodEnd,
      totalAlerts,
      alertsRead,
      alertsDismissed,
      alertsActioned,
      alertsSnoozed,
      readRate: totalAlerts > 0 ? Math.round((alertsRead / totalAlerts) * 100) : 0,
      actionRate: totalAlerts > 0 ? Math.round((alertsActioned / totalAlerts) * 100) : 0,
      byCategory,
      topTriggers,
      dailyTrend,
    };
  }
}
