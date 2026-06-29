import { describe, it, expect } from 'vitest';
import { ScannerQualityAnalytics } from '../ScannerQualityAnalytics';
import { ProductEventStore } from '../ProductEventStore';
import type { NormalizedMetricEvent } from '../ProductEventNormalizer';

function viewEvent(scanner: string): NormalizedMetricEvent {
  return {
    metricKey: 'pmf.engagement.scanner_views',
    value: 1,
    userId: 'user_1',
    timestamp: new Date().toISOString(),
    dimensions: { scanner, label: `Scanner: ${scanner}` },
  };
}

function actionEvent(scanner: string): NormalizedMetricEvent {
  return {
    metricKey: 'pmf.engagement.scanner_actions',
    value: 1,
    userId: 'user_1',
    timestamp: new Date().toISOString(),
    dimensions: { scanner, label: `Action: ${scanner}` },
  };
}

function dismissEvent(): NormalizedMetricEvent {
  return {
    metricKey: 'pmf.engagement.alerts_dismissed',
    value: 1,
    userId: 'user_1',
    timestamp: new Date().toISOString(),
    dimensions: { label: 'dismissed' },
  };
}

describe('ScannerQualityAnalytics', () => {
  it('reports zero counts from empty store', async () => {
    const store = new ProductEventStore();
    const aggregator = new ScannerQualityAnalytics();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.totalViews).toBe(0);
    expect(result.totalInteractions).toBe(0);
  });

  it('counts scanner views from store events', async () => {
    const store = new ProductEventStore();
    store.store(viewEvent('momentum'));

    const aggregator = new ScannerQualityAnalytics();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.totalViews).toBe(1);
  });

  it('counts interactions and dismissals', async () => {
    const store = new ProductEventStore();
    store.store(viewEvent('momentum'));
    store.store(actionEvent('momentum'));
    store.store(dismissEvent());

    const aggregator = new ScannerQualityAnalytics();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.totalInteractions).toBe(1);
    expect(result.totalDismissals).toBe(1);
  });

  it('tracks by scanner type', async () => {
    const store = new ProductEventStore();
    store.store(viewEvent('momentum'));
    store.store(viewEvent('value'));
    store.store(actionEvent('momentum'));

    const aggregator = new ScannerQualityAnalytics();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.topScanners.length).toBeGreaterThanOrEqual(2);
    const m = result.topScanners.find((s) => s.scanner === 'momentum');
    expect(m).toBeDefined();
    expect(m!.views).toBe(1);
    expect(m!.interactions).toBe(1);
  });

  it('calculates interaction rate', async () => {
    const store = new ProductEventStore();
    store.store(viewEvent('momentum'));
    store.store(viewEvent('value'));
    store.store(actionEvent('momentum'));

    const aggregator = new ScannerQualityAnalytics();
    const result = await aggregator.aggregate({ store, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(result.interactionRate).toBe(50); // 1/2 = 50%
  });
});
