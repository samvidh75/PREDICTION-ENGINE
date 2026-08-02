/**
 * PremiumIntentAnalytics — Tracks premium upgrade intent signals.
 *
 * Metrics:
 *  - Premium feature views (behind paywall)
 *  - Upgrade CTA clicks
 *  - Pricing page views
 *  - Feature request engagements
 *  - Upgrade intent score (composite)
 *  - Trial start rate (if applicable)
 *  - Conversion-ready users
 */

import type { AggregatorContext, PmfSubAggregator } from './PmfAggregationService';

export interface PremiumIntentReport {
  periodStart: string;
  periodEnd: string;
  premiumFeatureViews: number;
  upgradeCtaClicks: number;
  pricingPageViews: number;
  featureRequestEngagements: number;
  conversionReadyUsers: number;
  upgradeIntentScore: number;
  byFeature: Record<string, { views: number; ctaClicks: number }>;
  dailyTrend: Array<{ date: string; views: number; ctaClicks: number }>;
  topConversionReadySymbols: Array<{ symbol: string; score: number }>;
}

export class PremiumIntentAnalytics implements PmfSubAggregator {
  name = 'premiumIntent';

  // Internal state for sync test-style usage
  private state: {
    totalPremiumFeatureViews: number;
    upgradeCtaClicks: number;
    pricingPageViews: number;
    featureRequestEngagements: number;
    conversionReadyUsers: number;
    upgradeIntentScore: number;
  } = {
    totalPremiumFeatureViews: 0,
    upgradeCtaClicks: 0,
    pricingPageViews: 0,
    featureRequestEngagements: 0,
    conversionReadyUsers: 0,
    upgradeIntentScore: 0,
  };

  /**
   * Sync aggregate for direct event recording (test-style usage).
   */
  aggregate(event: {
    userId?: string;
    timestamp: string;
    metricKey: string;
    value: number;
    dimensions?: Record<string, string>;
  }): void;
  /**
   * Async aggregate for PmfSubAggregator interface (store-based).
   */
  aggregate(ctx: AggregatorContext): Promise<PremiumIntentReport>;
  async aggregate(
    input: AggregatorContext | {
      userId?: string;
      timestamp: string;
      metricKey: string;
      value: number;
      dimensions?: Record<string, string>;
    },
  ): Promise<PremiumIntentReport | void> {
    if ('store' in input && 'periodStart' in input) {
      return this.aggregateFromStore(input);
    }

    const event = input as {
      userId?: string;
      timestamp: string;
      metricKey: string;
      value: number;
      dimensions?: Record<string, string>;
    };

    switch (event.metricKey) {
      case 'pmf.premium.feature_view_rate':
        this.state.totalPremiumFeatureViews += event.value;
        break;
      case 'pmf.premium.upgrade_cta_click_rate':
        this.state.upgradeCtaClicks += event.value;
        break;
      case 'pmf.premium.conversion_ready_rate':
        this.state.conversionReadyUsers += event.value;
        break;
    }
  }

  /** Returns current aggregated results (sync, for tests) */
  getAggregated(): Record<string, number> {
    return { ...this.state };
  }

  /** Resets internal state */
  reset(): void {
    this.state = {
      totalPremiumFeatureViews: 0,
      upgradeCtaClicks: 0,
      pricingPageViews: 0,
      featureRequestEngagements: 0,
      conversionReadyUsers: 0,
      upgradeIntentScore: 0,
    };
  }

  private async aggregateFromStore(ctx: AggregatorContext): Promise<PremiumIntentReport> {
    const featureViewEvents = ctx.store.queryByMetricKey('pmf.engagement.premium_views', 5000);
    const ctaClickEvents = ctx.store.queryByMetricKey('pmf.engagement.upgrade_cta_clicks', 5000);
    const pricingEvents = ctx.store.queryByMetricKey('pmf.engagement.pricing_views', 5000);
    const featureRequestEvents = ctx.store.queryByMetricKey('pmf.engagement.feature_requests', 5000);

    const byFeature: Record<string, { views: number; ctaClicks: number }> = {};
    const dailyBuckets = new Map<string, { views: number; ctaClicks: number }>();
    const conversionScores = new Map<string, { views: number; ctaClicks: number; pricingViews: number }>();

    for (const event of featureViewEvents) {
      const feature = event.dimensions?.feature ?? event.dimensions?.label ?? 'unknown';
      if (!byFeature[feature]) byFeature[feature] = { views: 0, ctaClicks: 0 };
      byFeature[feature].views += event.value;

      const symbol = event.dimensions?.symbol ?? '';
      if (symbol) {
        if (!conversionScores.has(symbol)) conversionScores.set(symbol, { views: 0, ctaClicks: 0, pricingViews: 0 });
        conversionScores.get(symbol)!.views += event.value;
      }

      const date = event.timestamp.slice(0, 10);
      if (!dailyBuckets.has(date)) dailyBuckets.set(date, { views: 0, ctaClicks: 0 });
      dailyBuckets.get(date)!.views += event.value;
    }

    for (const event of ctaClickEvents) {
      const feature = event.dimensions?.feature ?? event.dimensions?.label ?? 'unknown';
      if (!byFeature[feature]) byFeature[feature] = { views: 0, ctaClicks: 0 };
      byFeature[feature].ctaClicks += event.value;

      const symbol = event.dimensions?.symbol ?? '';
      if (symbol) {
        if (!conversionScores.has(symbol)) conversionScores.set(symbol, { views: 0, ctaClicks: 0, pricingViews: 0 });
        conversionScores.get(symbol)!.ctaClicks += event.value;
      }

      const date = event.timestamp.slice(0, 10);
      if (!dailyBuckets.has(date)) dailyBuckets.set(date, { views: 0, ctaClicks: 0 });
      dailyBuckets.get(date)!.ctaClicks += event.value;
    }

    for (const event of pricingEvents) {
      const symbol = event.dimensions?.symbol ?? '';
      if (symbol) {
        if (!conversionScores.has(symbol)) conversionScores.set(symbol, { views: 0, ctaClicks: 0, pricingViews: 0 });
        conversionScores.get(symbol)!.pricingViews += event.value;
      }
    }

    const totalViews = featureViewEvents.reduce((a, e) => a + e.value, 0);
    const totalCtaClicks = ctaClickEvents.reduce((a, e) => a + e.value, 0);
    const totalPricingViews = pricingEvents.reduce((a, e) => a + e.value, 0);
    const totalFeatureRequests = featureRequestEvents.reduce((a, e) => a + e.value, 0);

    // Calculate conversion-ready users
    let conversionReadyUsers = 0;
    const topConversionReadySymbols: Array<{ symbol: string; score: number }> = [];

    for (const [symbol, data] of conversionScores) {
      if (data.ctaClicks >= 2 && data.pricingViews >= 1) {
        conversionReadyUsers++;
        const score = data.ctaClicks * 10 + data.pricingViews * 5 + Math.min(data.views, 20);
        topConversionReadySymbols.push({ symbol, score });
      }
    }

    topConversionReadySymbols.sort((a, b) => b.score - a.score);

    // Composite upgrade intent score: weighted combination of signals
    const intentScore =
      totalViews * 1 +
      totalCtaClicks * 10 +
      totalPricingViews * 5 +
      totalFeatureRequests * 3 +
      conversionReadyUsers * 15;

    const dailyTrend = Array.from(dailyBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, data]) => ({ date, views: data.views, ctaClicks: data.ctaClicks }));

    return {
      periodStart: ctx.periodStart,
      periodEnd: ctx.periodEnd,
      premiumFeatureViews: totalViews,
      upgradeCtaClicks: totalCtaClicks,
      pricingPageViews: totalPricingViews,
      featureRequestEngagements: totalFeatureRequests,
      conversionReadyUsers,
      upgradeIntentScore: intentScore,
      byFeature,
      dailyTrend,
      topConversionReadySymbols: topConversionReadySymbols.slice(0, 10),
    };
  }
}
