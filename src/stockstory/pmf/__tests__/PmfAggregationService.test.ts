import { describe, it, expect } from 'vitest';
import { PmfAggregationService } from '../PmfAggregationService';
import { ProductEventNormalizer } from '../ProductEventNormalizer';

describe('PmfAggregationService', () => {
  const service = new PmfAggregationService();
  const normalizer = new ProductEventNormalizer();

  it('initializes with zero stats', () => {
    const snapshot = service.buildSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.totalEvents).toBe(0);
  });

  it('processes normalized events', () => {
    const events = normalizer.normalize({
      eventType: 'discovery',
      action: 'page_view',
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metadata: { page: '/signup', label: 'Signup' },
    });
    events.forEach((e) => service.process(e));
    const snapshot = service.buildSnapshot();
    expect(snapshot.totalEvents).toBeGreaterThan(0);
  });

  it('builds snapshot with funnel data', () => {
    const events = normalizer.normalize({
      eventType: 'engagement',
      action: 'page_view',
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metadata: { page: '/stock/RELIANCE', label: 'Stock view', symbol: 'RELIANCE' },
    });
    events.forEach((e) => service.process(e));
    const snapshot = service.buildSnapshot();
    expect(snapshot.funnel).toBeDefined();
    expect(snapshot.funnel.signup).toBeDefined();
  });

  it('builds snapshot with research quality data', () => {
    const events = normalizer.normalize({
      eventType: 'feedback',
      action: 'rating',
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metadata: { symbol: 'TCS', component: 'thesis', rating: '4', label: 'Rating: 4/5' },
    });
    events.forEach((e) => service.process(e));
    const snapshot = service.buildSnapshot();
    expect(snapshot.researchQuality).toBeDefined();
  });

  it('builds snapshot with search demand data', () => {
    const events = normalizer.normalize({
      eventType: 'discovery',
      action: 'search',
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metadata: { query: 'RELIANCE', label: 'Search: RELIANCE' },
    });
    events.forEach((e) => service.process(e));
    const snapshot = service.buildSnapshot();
    expect(snapshot.searchDemand).toBeDefined();
  });

  it('resets state', () => {
    const s2 = new PmfAggregationService();
    s2.reset();
    const snapshot = s2.buildSnapshot();
    expect(snapshot.totalEvents).toBe(0);
  });
});
