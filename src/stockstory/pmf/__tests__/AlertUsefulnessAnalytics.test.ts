import { describe, it, expect } from 'vitest';
import { AlertUsefulnessAnalytics } from '../AlertUsefulnessAnalytics';

describe('AlertUsefulnessAnalytics', () => {
  const aggregator = new AlertUsefulnessAnalytics();

  it('initializes with zero counts', () => {
    const result = aggregator.getAggregated();
    expect(result.totalDelivered).toBe(0);
  });

  it('tracks delivered alerts', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.alert.delivery_rate',
      value: 1,
      dimensions: { category: 'price_target', label: 'Alert delivered' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalDelivered).toBe(1);
  });

  it('tracks alert views', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.alert.read_rate',
      value: 1,
      dimensions: { category: 'price_target', label: 'Alert read' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalRead).toBe(1);
  });

  it('tracks alert actions', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.alert.action_rate',
      value: 1,
      dimensions: { category: 'price_target', label: 'Alert action' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalActions).toBe(1);
  });

  it('calculates action rate from delivered', () => {
    const result = aggregator.getAggregated();
    expect(typeof result.actionRate).toBe('number');
    expect(result.actionRate).toBeGreaterThan(0);
  });

  it('resets state', () => {
    const a2 = new AlertUsefulnessAnalytics();
    a2.reset();
    expect(a2.getAggregated().totalDelivered).toBe(0);
  });
});
