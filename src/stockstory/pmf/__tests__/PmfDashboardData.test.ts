import { describe, it, expect } from 'vitest';
import { PmfDashboardData } from '../PmfDashboardData';
import { ProductEventNormalizer } from '../ProductEventNormalizer';

describe('PmfDashboardData', () => {
  it('generates dashboard payload from events', async () => {
    const dashboard = new PmfDashboardData();
    const normalizer = new ProductEventNormalizer();

    const testEvents = [
      { eventType: 'discovery', action: 'page_view', userId: 'user_1', metadata: { page: '/signup', label: 'Signup' } },
      { eventType: 'discovery', action: 'search', userId: 'user_1', metadata: { query: 'RELIANCE', label: 'Search' } },
      { eventType: 'engagement', action: 'page_view', userId: 'user_1', metadata: { page: '/stock/RELIANCE', label: 'Stock view', symbol: 'RELIANCE' } },
      { eventType: 'feedback', action: 'rating', userId: 'user_1', metadata: { symbol: 'RELIANCE', component: 'thesis', rating: '5', label: 'Rating 5' } },
    ];

    for (const raw of testEvents) {
      const normalized = normalizer.normalize({
        ...raw,
        timestamp: new Date().toISOString(),
      });
      normalized.forEach((e) => dashboard.process(e));
    }

    const payload = await dashboard.generate();
    expect(payload).toBeDefined();
    expect(payload.timestamp).toBeDefined();
    expect(payload.funnel).toBeDefined();
    expect(payload.researchQuality).toBeDefined();
    expect(payload.searchDemand).toBeDefined();
    expect(payload.engagement).toBeDefined();
    expect(payload.scanner).toBeDefined();
    expect(payload.alerts).toBeDefined();
    expect(payload.scenarios).toBeDefined();
    expect(payload.premium).toBeDefined();
    expect(payload.retention).toBeDefined();
  });

  it('produces formatted summary text', async () => {
    const dashboard = new PmfDashboardData();
    const normalizer = new ProductEventNormalizer();

    const raw = {
      eventType: 'discovery',
      action: 'page_view',
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metadata: { page: '/signup', label: 'Signup' },
    };
    normalizer.normalize(raw).forEach((e) => dashboard.process(e));

    const payload = await dashboard.generate();
    const summary = PmfDashboardData.formatDashboardSummary(payload);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(50);
    expect(summary).toContain('PMF Dashboard');
  });
});
