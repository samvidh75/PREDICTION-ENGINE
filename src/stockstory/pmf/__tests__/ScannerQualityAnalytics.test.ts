import { describe, it, expect } from 'vitest';
import { ScannerQualityAnalytics } from '../ScannerQualityAnalytics';

describe('ScannerQualityAnalytics', () => {
  const aggregator = new ScannerQualityAnalytics();

  it('initializes with zero counts', () => {
    const result = aggregator.getAggregated();
    expect(result.totalViews).toBe(0);
    expect(result.dismissalRate).toBe(0);
  });

  it('tracks scanner views', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.scanner.view_rate',
      value: 1,
      dimensions: { scanner: 'momentum', label: 'Scanner view' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalViews).toBe(1);
  });

  it('tracks scanner interactions', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.scanner.interaction_rate',
      value: 1,
      dimensions: { scanner: 'momentum', label: 'Scanner interaction' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalInteractions).toBe(1);
  });

  it('tracks scanner dismissals', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.scanner.dismissal_rate',
      value: 1,
      dimensions: { scanner: 'momentum', label: 'Scanner dismissal' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalDismissals).toBe(1);
  });

  it('tracks by scanner type', () => {
    const result = aggregator.getAggregated();
    expect(result.byScanner).toBeDefined();
    if (result.byScanner.momentum) {
      expect(result.byScanner.momentum.views).toBeGreaterThan(0);
    }
  });

  it('resets state', () => {
    const a2 = new ScannerQualityAnalytics();
    a2.reset();
    expect(a2.getAggregated().totalViews).toBe(0);
  });
});
