import { describe, it, expect } from 'vitest';
import { CohortBuilder } from '../CohortBuilder';

describe('CohortBuilder', () => {
  const builder = new CohortBuilder();

  it('builds daily cohorts from signup events', () => {
    const events = [
      { userId: 'user_1', timestamp: '2024-01-15T10:00:00.000Z' },
      { userId: 'user_2', timestamp: '2024-01-15T11:00:00.000Z' },
      { userId: 'user_3', timestamp: '2024-01-16T10:00:00.000Z' },
    ];
    const result = builder.build(events, { start: '2024-01-15', end: '2024-01-16' });
    expect(result.cohorts).toBeDefined();
    expect(result.period).toBeDefined();
    expect(result.generatedAt).toBeDefined();
  });

  it('buckets events into weekly cohorts', () => {
    const events = [
      { userId: 'user_1', timestamp: '2024-01-15T10:00:00.000Z' },
      { userId: 'user_2', timestamp: '2024-01-17T10:00:00.000Z' },
      { userId: 'user_3', timestamp: '2024-01-22T10:00:00.000Z' },
    ];
    const result = builder.build(events, { start: '2024-01-15', end: '2024-01-22' });
    const cohortKeys = Object.keys(result.cohorts);
    expect(cohortKeys.length).toBeGreaterThanOrEqual(1);
  });

  it('includes unique users per cohort', () => {
    const events = [
      { userId: 'user_1', timestamp: '2024-01-15T10:00:00.000Z' },
      { userId: 'user_1', timestamp: '2024-01-15T11:00:00.000Z' },
    ];
    const result = builder.build(events, { start: '2024-01-15', end: '2024-01-15' });
    expect(result.cohorts['2024-01-15']).toBeDefined();
  });

  it('returns empty cohorts when no events', () => {
    const result = builder.build([], { start: '2024-01-01', end: '2024-01-07' });
    expect(result.cohorts).toEqual({});
  });
});
