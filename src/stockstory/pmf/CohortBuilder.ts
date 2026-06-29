/**
 * CohortBuilder — Groups users into cohorts by signup period for retention analysis.
 *
 * Supports daily, weekly, and monthly cohort windows.
 */

export interface Cohort {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  userIds: string[];
  userCount: number;
}

export type CohortPeriod = 'daily' | 'weekly' | 'monthly';

export interface CohortBuildResult {
  cohorts: Record<string, Cohort>;
  period: CohortPeriod;
  generatedAt: string;
}

export class CohortBuilder {
  private builtCohorts: Record<string, Record<string, Cohort>> = {};

  build(
    signupEvents: Array<{ userId?: string; timestamp: string }>,
    period: CohortPeriod | { start: string; end: string } = 'weekly',
  ): CohortBuildResult {
    let effectivePeriod: CohortPeriod;
    let startFilter: string | null = null;
    let endFilter: string | null = null;

    if (typeof period === 'object' && period !== null) {
      effectivePeriod = 'daily';
      startFilter = period.start;
      endFilter = period.end;
    } else {
      effectivePeriod = period as CohortPeriod;
    }

    const buckets = new Map<string, { start: string; end: string; userIds: Set<string> }>();

    for (const event of signupEvents) {
      // Apply date filter if provided
      if (startFilter && event.timestamp < startFilter) continue;
      if (endFilter && event.timestamp.slice(0, 10) > endFilter) continue;

      const userId = event.userId ?? 'anonymous';
      const date = new Date(event.timestamp);
      const key = this.bucketKey(date, effectivePeriod);

      if (!buckets.has(key)) {
        const { start, end } = this.bucketRange(date, effectivePeriod);
        buckets.set(key, { start, end, userIds: new Set() });
      }
      buckets.get(key)!.userIds.add(userId);
    }

    const sortedKeys = Array.from(buckets.keys()).sort();
    const cohortsRecord: Record<string, Cohort> = {};
    for (const key of sortedKeys) {
      const b = buckets.get(key)!;
      cohortsRecord[key] = {
        id: key,
        label: this.formatLabel(key, effectivePeriod),
        startDate: b.start,
        endDate: b.end,
        userIds: Array.from(b.userIds),
        userCount: b.userIds.size,
      };
    }

    const result: CohortBuildResult = {
      cohorts: cohortsRecord,
      period: effectivePeriod,
      generatedAt: new Date().toISOString(),
    };

    this.builtCohorts[effectivePeriod] = cohortsRecord;

    return result;
  }

  getCohorts(period: CohortPeriod = 'weekly'): Record<string, Cohort> {
    return this.builtCohorts[period] ?? {};
  }

  private bucketKey(date: Date, period: CohortPeriod): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    // ISO week number
    const week = this.getWeekNumber(date);

    switch (period) {
      case 'daily':
        return `${y}-${m}-${d}`;
      case 'weekly':
        return `${y}-W${String(week).padStart(2, '0')}`;
      case 'monthly':
        return `${y}-${m}`;
    }
  }

  private bucketRange(date: Date, period: CohortPeriod): { start: string; end: string } {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    switch (period) {
      case 'daily':
        return { start: `${y}-${m}-${d}T00:00:00.000Z`, end: `${y}-${m}-${d}T23:59:59.999Z` };
      case 'weekly': {
        const dayOfWeek = date.getDay();
        const start = new Date(date);
        start.setDate(date.getDate() - dayOfWeek);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return {
          start: start.toISOString().slice(0, 10) + 'T00:00:00.000Z',
          end: end.toISOString().slice(0, 10) + 'T23:59:59.999Z',
        };
      }
      case 'monthly':
        return {
          start: `${y}-${m}-01T00:00:00.000Z`,
          end: new Date(y, date.getMonth() + 1, 0).toISOString().slice(0, 10) + 'T23:59:59.999Z',
        };
    }
  }

  private formatLabel(key: string, period: CohortPeriod): string {
    switch (period) {
      case 'daily':
        return `Day ${key}`;
      case 'weekly': {
        const [, w] = key.split('-W');
        return `Week ${w}`;
      }
      case 'monthly':
        return `Month ${key}`;
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
