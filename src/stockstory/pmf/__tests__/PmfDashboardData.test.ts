import { describe, it, expect } from 'vitest';
import { buildDashboardData, formatDashboardSummary } from '../PmfDashboardData';
import { ProductEventStore } from '../ProductEventStore';
import { ProductEventNormalizer } from '../ProductEventNormalizer';
import type { NormalizedMetricEvent } from '../ProductEventNormalizer';

describe('PmfDashboardData', () => {
  function seedStore(store: ProductEventStore, events: NormalizedMetricEvent[]) {
    for (const e of events) {
      store.store(e);
    }
  }

  it('generates dashboard payload from events', async () => {
    const store = new ProductEventStore();
    const normalizer = new ProductEventNormalizer();
    const now = new Date().toISOString();
    const periodStart = '2025-01-01';
    const periodEnd = '2025-12-31';

    const testEvents = [
      { eventType: 'discovery', action: 'page_view', userId: 'user_1', metadata: { page: '/signup', label: 'Signup' } },
      { eventType: 'discovery', action: 'search', userId: 'user_1', metadata: { query: 'RELIANCE', label: 'Search' } },
      { eventType: 'engagement', action: 'page_view', userId: 'user_1', metadata: { page: '/stock/RELIANCE', label: 'Stock view', symbol: 'RELIANCE' } },
      { eventType: 'feedback', action: 'rating', userId: 'user_1', metadata: { symbol: 'RELIANCE', component: 'thesis', rating: '5', label: 'Rating 5' } },
    ];

    const normalized: NormalizedMetricEvent[] = [];
    for (const raw of testEvents) {
      normalized.push(...normalizer.normalize({ ...raw, timestamp: now }).events);
    }
    seedStore(store, normalized);

    const payload = await buildDashboardData(store, periodStart, periodEnd);
    expect(payload).toBeDefined();
    expect(payload.generatedAt).toBeDefined();
    expect(payload.funnel).toBeDefined();
    expect(payload.researchQuality).toBeDefined();
    expect(payload.searchDemand).toBeDefined();
    expect(payload.scannerQuality).toBeDefined();
    expect(payload.alertUsefulness).toBeDefined();
    expect(payload.scenarioUsefulness).toBeDefined();
    expect(payload.premiumIntent).toBeDefined();
    expect(payload.retention).toBeDefined();
  });

  it('produces formatted summary text', async () => {
    const store = new ProductEventStore();
    const normalizer = new ProductEventNormalizer();
    const now = new Date().toISOString();
    const periodStart = '2025-01-01';
    const periodEnd = '2025-12-31';

    const raw = {
      eventType: 'discovery',
      action: 'page_view',
      userId: 'user_1',
      timestamp: now,
      metadata: { page: '/signup', label: 'Signup' },
    };
    const normalized = normalizer.normalize(raw).events;
    seedStore(store, normalized);

    const payload = await buildDashboardData(store, periodStart, periodEnd);
    const summary = formatDashboardSummary(payload);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(50);
    expect(summary).toContain('PMF Dashboard');
  });
});
