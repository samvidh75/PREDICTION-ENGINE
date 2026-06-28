/**
 * FunnelAggregator — Activation funnel conversion tracking.
 *
 * Tracks users through key activation milestones:
 *   Signup → First Search → First Stock View → Watchlist Add → Compare
 *
 * For each step, reports unique users who reached it and conversion rate
 * from the previous step.
 */

import type { AggregatorContext, PmfSubAggregator } from './PmfAggregationService';
import { PmfMetricRegistry } from './PmfMetricRegistry';

export interface FunnelReport {
  periodStart: string;
  periodEnd: string;
  steps: FunnelStepReport[];
  overallConversion: number | null;
}

export interface FunnelStepReport {
  name: string;
  metricKey: string;
  uniqueUsers: number;
  conversionFromPrevious: number | null;
  conversionFromFirst: number | null;
}

const FUNNEL_STEPS = [
  { name: 'Sign-up', metricKey: PmfMetricRegistry.ACTIVATION_SIGNUP.key },
  { name: 'First Search', metricKey: PmfMetricRegistry.ACTIVATION_FIRST_SEARCH.key },
  { name: 'First Stock View', metricKey: PmfMetricRegistry.ACTIVATION_FIRST_STOCK_VIEW.key },
  { name: 'First Watchlist Add', metricKey: PmfMetricRegistry.ACTIVATION_FIRST_WATCHLIST.key },
  { name: 'First Compare', metricKey: PmfMetricRegistry.ACTIVATION_FIRST_COMPARE.key },
];

export class FunnelAggregator implements PmfSubAggregator {
  name = 'funnel';

  async aggregate(ctx: AggregatorContext): Promise<FunnelReport> {
    const steps: FunnelStepReport[] = [];
    let firstCount = 0;

    for (let i = 0; i < FUNNEL_STEPS.length; i++) {
      const step = FUNNEL_STEPS[i];
      const events = ctx.store.queryByMetricKey(step.metricKey, 5000);
      const uniqueUsers = this.uniqueUserCount(events, ctx);

      if (i === 0) firstCount = uniqueUsers;

      const prevCount = i > 0 ? steps[i - 1].uniqueUsers : 0;
      const conversionFromPrevious = prevCount > 0
        ? Math.round((uniqueUsers / prevCount) * 100)
        : null;

      const conversionFromFirst = firstCount > 0
        ? Math.round((uniqueUsers / firstCount) * 100)
        : null;

      steps.push({
        name: step.name,
        metricKey: step.metricKey,
        uniqueUsers,
        conversionFromPrevious,
        conversionFromFirst,
      });
    }

    const overallConversion =
      firstCount > 0 && steps.length > 0
        ? Math.round((steps[steps.length - 1].uniqueUsers / firstCount) * 100)
        : null;

    return {
      periodStart: ctx.periodStart,
      periodEnd: ctx.periodEnd,
      steps,
      overallConversion,
    };
  }

  private uniqueUserCount(
    events: Array<{ userId?: string }>,
    _ctx: AggregatorContext,
  ): number {
    const userIds = new Set<string>();
    for (const e of events) {
      if (e.userId) userIds.add(e.userId);
    }
    // If no userIds, use event count as proxy
    return userIds.size > 0 ? userIds.size : events.length;
  }
}
