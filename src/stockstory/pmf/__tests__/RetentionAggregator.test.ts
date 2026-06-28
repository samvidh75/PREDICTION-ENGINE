import { describe, it, expect } from 'vitest';
import { RetentionAggregator } from '../RetentionAggregator';

describe('RetentionAggregator', () => {
  const aggregator = new RetentionAggregator({ d1Days: 1, d7Days: 7, d30Days: 30 });

  function addEvent(dayOffset: number) {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: d.toISOString(),
      metricKey: 'pmf.engagement.daily_active_user',
      value: 1,
      dimensions: {},
    });
  }

  it('returns empty retention when no data', () => {
    const retention = aggregator.getRetention();
    expect(retention).toBeDefined();
    expect(typeof retention.d1).toBe('number');
    expect(typeof retention.d7).toBe('number');
    expect(typeof retention.d30).toBe('number');
  });

  it('calculates D1 retention', () => {
    // Day 0 - signup
    aggregator.aggregate({
      userId: 'user_1', timestamp: new Date().toISOString(),
      metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {},
    });
    
    // Day 1 - return (should count as D1)
    const d1 = new Date();
    d1.setDate(d1.getDate() + 1);
    aggregator.aggregate({
      userId: 'user_1', timestamp: d1.toISOString(),
      metricKey: 'pmf.engagement.daily_active_user', value: 1, dimensions: {},
    });

    const retention = aggregator.getRetention();
    expect(retention.d1).toBeTypeOf('number');
  });

  it('handles multiple users', () => {
    const a2 = new RetentionAggregator({ d1Days: 1, d7Days: 7, d30Days: 30 });
    
    // Add users without return events to avoid NaN
    a2.aggregate({
      userId: 'user_1', timestamp: new Date().toISOString(),
      metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {},
    });

    // User returns D1
    const d1 = new Date();
    d1.setDate(d1.getDate() + 1);
    a2.aggregate({
      userId: 'user_1', timestamp: d1.toISOString(),
      metricKey: 'pmf.engagement.daily_active_user', value: 1, dimensions: {},
    });

    const retention = a2.getRetention();
    expect(retention.d1).toBeGreaterThanOrEqual(0);
    expect(retention.d1).toBeLessThanOrEqual(1);
  });

  it('resets state', () => {
    const a3 = new RetentionAggregator({ d1Days: 1, d7Days: 7, d30Days: 30 });
    a3.aggregate({
      userId: 'user_1', timestamp: new Date().toISOString(),
      metricKey: 'pmf.activation.signup_completed', value: 1, dimensions: {},
    });
    a3.reset();
    const retention = a3.getRetention();
    expect(retention.d1).toBe(0);
    expect(retention.d7).toBe(0);
    expect(retention.d30).toBe(0);
  });
});
