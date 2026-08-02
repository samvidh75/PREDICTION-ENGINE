import { describe, it, expect } from 'vitest';
import { AlertUsefulnessAnalytics } from '../AlertUsefulnessAnalytics';
import { ProductEventStore } from '../ProductEventStore';
import type { NormalizedMetricEvent } from '../ProductEventNormalizer';

function alertEvent(
  metricKey: string,
  category: string,
  value = 1,
): NormalizedMetricEvent {
  return {
    metricKey,
    value,
    userId: 'user_1',
    timestamp: new Date().toISOString(),
    dimensions: { category, label: `Alert: ${category}` },
  };
}

describe('AlertUsefulnessAnalytics', () => {
  it('reports zero counts from empty store', async () => {
    const store = new ProductEventStore();
    const aggregator = new AlertUsefulnessAnalytics();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.totalAlerts).toBe(0);
    expect(result.readRate).toBe(0);
    expect(result.actionRate).toBe(0);
  });

  it('counts delivered alerts from store events', async () => {
    const store = new ProductEventStore();
    store.store(alertEvent('pmf.engagement.alerts_viewed', 'price_target'));

    const aggregator = new AlertUsefulnessAnalytics();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.totalAlerts).toBe(1);
  });

  it('counts read and actioned alerts', async () => {
    const store = new ProductEventStore();
    store.store(alertEvent('pmf.engagement.alerts_viewed', 'price_target'));
    store.store(alertEvent('pmf.engagement.alerts_clicked', 'price_target'));
    store.store(alertEvent('pmf.engagement.alerts_set_price', 'price_target'));

    const aggregator = new AlertUsefulnessAnalytics();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.alertsRead).toBe(1);
    expect(result.alertsActioned).toBe(1);
  });

  it('groups by category', async () => {
    const store = new ProductEventStore();
    store.store(alertEvent('pmf.engagement.alerts_viewed', 'price_target'));
    store.store(alertEvent('pmf.engagement.alerts_viewed', 'earnings'));
    store.store(alertEvent('pmf.engagement.alerts_clicked', 'earnings'));

    const aggregator = new AlertUsefulnessAnalytics();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(Object.keys(result.byCategory).length).toBeGreaterThanOrEqual(2);
  });

  it('calculates action and read rates', async () => {
    const store = new ProductEventStore();
    store.store(alertEvent('pmf.engagement.alerts_viewed', 'price_target'));
    store.store(alertEvent('pmf.engagement.alerts_clicked', 'price_target'));
    store.store(alertEvent('pmf.engagement.alerts_set_price', 'price_target'));

    const aggregator = new AlertUsefulnessAnalytics();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.readRate).toBe(100);  // 1/1 read
    expect(result.actionRate).toBe(100); // 1/1 actioned
  });
});
