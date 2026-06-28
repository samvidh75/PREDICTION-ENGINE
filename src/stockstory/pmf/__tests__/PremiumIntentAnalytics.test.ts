import { describe, it, expect } from 'vitest';
import { PremiumIntentAnalytics } from '../PremiumIntentAnalytics';

describe('PremiumIntentAnalytics', () => {
  const aggregator = new PremiumIntentAnalytics();

  it('initializes with zero counts', () => {
    const result = aggregator.getAggregated();
    expect(result.totalPremiumFeatureViews).toBe(0);
    expect(result.upgradeCtaClicks).toBe(0);
  });

  it('tracks premium feature views', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.premium.feature_view_rate',
      value: 1,
      dimensions: { feature: 'advanced_analytics', label: 'Premium feature view' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalPremiumFeatureViews).toBe(1);
  });

  it('tracks upgrade CTA clicks', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.premium.upgrade_cta_click_rate',
      value: 1,
      dimensions: { feature: 'advanced_analytics', label: 'Upgrade CTA click' },
    });
    const result = aggregator.getAggregated();
    expect(result.upgradeCtaClicks).toBe(1);
  });

  it('tracks conversion-ready users', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.premium.conversion_ready_rate',
      value: 1,
      dimensions: { feature: 'advanced_analytics', label: 'Conversion ready' },
    });
    const result = aggregator.getAggregated();
    expect(result.conversionReadyUsers).toBe(1);
  });

  it('resets state', () => {
    const a2 = new PremiumIntentAnalytics();
    a2.reset();
    expect(a2.getAggregated().totalPremiumFeatureViews).toBe(0);
  });
});
