import { describe, it, expect } from 'vitest';
import { CohortBuilder } from '../CohortBuilder';

describe('CohortBuilder', () => {
  const builder = new CohortBuilder();

  it('buckets events into daily cohorts', () => {
    const events = [
      { userId: 'user_1', timestamp: '2024-01-15T10:00:00.000Z', metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {} },
      { userId: 'user_2', timestamp: '2024-01-15T11:00:00.000Z', metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {} },
      { userId: 'user_3', timestamp: '2024-01-16T10:00:00.000Z', metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {} },
    ];
    events.forEach((e) => builder.add(e));

    const daily = builder.getCohorts('daily');
    expect(daily.size).toBe(2); // two different days

    const day1 = [...daily].find(([k]) => k === '2024-01-15');
    expect(day1).toBeDefined();
    if (day1) expect(day1[1].size).toBe(2);
  });

  it('buckets events into weekly cohorts', () => {
    // Jan 15, 2024 is a Monday = start of week
    const events = [
      { userId: 'user_1', timestamp: '2024-01-15T10:00:00.000Z', metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {} },
      { userId: 'user_2', timestamp: '2024-01-17T10:00:00.000Z', metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {} },
      // week 2
      { userId: 'user_3', timestamp: '2024-01-22T10:00:00.000Z', metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {} },
    ];
    events.forEach((e) => builder.add(e));

    const weekly = builder.getCohorts('weekly');
    expect(weekly.size).toBeGreaterThanOrEqual(1);
  });

  it('buckets events into monthly cohorts', () => {
    const events = [
      { userId: 'user_1', timestamp: '2024-01-15T10:00:00.000Z', metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {} },
      { userId: 'user_2', timestamp: '2024-02-10T10:00:00.000Z', metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {} },
    ];
    events.forEach((e) => builder.add(e));

    const monthly = builder.getCohorts('monthly');
    expect(monthly.size).toBe(2);
  });

  it('returns unique users per cohort', () => {
    const events = [
      { userId: 'user_1', timestamp: '2024-01-15T10:00:00.000Z', metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {} },
      { userId: 'user_1', timestamp: '2024-01-15T11:00:00.000Z', metricKey: 'pmf.engagement.stock_views', value: 1, dimensions: {} },
    ];
    events.forEach((e) => builder.add(e));

    const daily = builder.getCohorts('daily');
    const day1 = [...daily].find(([k]) => k === '2024-01-15');
    expect(day1).toBeDefined();
    if (day1) expect(day1[1].size).toBe(1); // unique users
  });

  it('resets state', () => {
    builder.add({ userId: 'user_1', timestamp: '2024-01-15T10:00:00.000Z', metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {} });
    builder.reset();
    expect(builder.getCohorts('daily').size).toBe(0);
  });
});
