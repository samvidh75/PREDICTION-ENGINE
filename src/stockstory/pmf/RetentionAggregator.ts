/**
 * RetentionAggregator — Calculates D1, D7, D30 retention rates from cohorts.
 *
 * For each cohort, tracks what fraction of users returned on days
 * 1, 7, and 30 after their first activity.
 */

import type { AggregatorContext, PmfSubAggregator } from './PmfAggregationService';
import type { Cohort } from './CohortBuilder';

export interface RetentionReport {
  periodStart: string;
  periodEnd: string;
  cohorts: CohortRetention[];
  overall: {
    d1: number | null;
    d7: number | null;
    d30: number | null;
  };
}

export interface CohortRetention {
  cohortId: string;
  cohortLabel: string;
  userCount: number;
  d1: number | null;
  d7: number | null;
  d30: number | null;
}

export class RetentionAggregator implements PmfSubAggregator {
  name = 'retention';

  async aggregate(ctx: AggregatorContext): Promise<RetentionReport> {
    // Query signup and session events
    const signupEvents = ctx.store.queryByMetricKey('pmf.activation.signup', 5000);
    const sessionEvents = ctx.store.queryByMetricKey('pmf.retention.wau', 5000);

    // Build user->first activity date map
    const userFirstActive = new Map<string, string>();
    for (const e of signupEvents) {
      if (e.userId && !userFirstActive.has(e.userId)) {
        userFirstActive.set(e.userId, e.timestamp);
      }
    }

    // Build user->activity dates set
    const userActivityDates = new Map<string, Set<string>>();
    for (const e of sessionEvents) {
      if (e.userId) {
        const date = e.timestamp.slice(0, 10);
        if (!userActivityDates.has(e.userId)) {
          userActivityDates.set(e.userId, new Set());
        }
        userActivityDates.get(e.userId)!.add(date);
      }
    }

    // Group into cohorts by signup week
    const cohortMap = new Map<string, { users: Map<string, string> }>();
    for (const [userId, firstActive] of userFirstActive) {
      const date = new Date(firstActive);
      const weekKey = `${date.getFullYear()}-W${String(this.getWeekNumber(date)).padStart(2, '0')}`;
      if (!cohortMap.has(weekKey)) {
        cohortMap.set(weekKey, { users: new Map() });
      }
      cohortMap.get(weekKey)!.users.set(userId, firstActive);
    }

    const cohorts: CohortRetention[] = [];
    let totalD1 = 0;
    let totalD1Users = 0;
    let totalD7 = 0;
    let totalD7Users = 0;
    let totalD30 = 0;
    let totalD30Users = 0;

    for (const [cohortId, cohort] of cohortMap) {
      let d1Count = 0;
      let d7Count = 0;
      let d30Count = 0;

      for (const [userId, firstActive] of cohort.users) {
        const firstDate = new Date(firstActive);
        const dates = userActivityDates.get(userId);
        if (!dates) continue;

        const d1Target = this.addDays(firstDate, 1).toISOString().slice(0, 10);
        const d7Target = this.addDays(firstDate, 7).toISOString().slice(0, 10);
        const d30Target = this.addDays(firstDate, 30).toISOString().slice(0, 10);

        if (dates.has(d1Target)) d1Count++;
        if (dates.has(d7Target)) d7Count++;
        if (dates.has(d30Target)) d30Count++;
      }

      const userCount = cohort.users.size;
      const d1 = userCount > 0 ? Math.round((d1Count / userCount) * 100) : null;
      const d7 = userCount > 0 ? Math.round((d7Count / userCount) * 100) : null;
      const d30 = userCount > 0 ? Math.round((d30Count / userCount) * 100) : null;

      if (d1 !== null) { totalD1 += d1; totalD1Users++; }
      if (d7 !== null) { totalD7 += d7; totalD7Users++; }
      if (d30 !== null) { totalD30 += d30; totalD30Users++; }

      cohorts.push({ cohortId, cohortLabel: `Week ${cohortId.split('-W')[1] ?? cohortId}`, userCount, d1, d7, d30 });
    }

    return {
      periodStart: ctx.periodStart,
      periodEnd: ctx.periodEnd,
      cohorts: cohorts.slice(-12), // Last 12 cohorts
      overall: {
        d1: totalD1Users > 0 ? Math.round(totalD1 / totalD1Users) : null,
        d7: totalD7Users > 0 ? Math.round(totalD7 / totalD7Users) : null,
        d30: totalD30Users > 0 ? Math.round(totalD30 / totalD30Users) : null,
      },
    };
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
