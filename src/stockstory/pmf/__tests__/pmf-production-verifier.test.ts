import { describe, it, expect } from 'vitest';
import { PmfMetricRegistry } from '../PmfMetricRegistry';
import { ProductEventNormalizer } from '../ProductEventNormalizer';
import { ProductEventValidator } from '../ProductEventValidator';
import { ProductEventStore } from '../ProductEventStore';
import { ResearchQualityAggregator } from '../ResearchQualityAggregator';
import { FunnelAggregator } from '../FunnelAggregator';
import { CohortBuilder } from '../CohortBuilder';
import { RetentionAggregator } from '../RetentionAggregator';
import { SearchDemandAggregator } from '../SearchDemandAggregator';
import { ExperimentRegistry } from '../ExperimentRegistry';

describe('Production Verifier Checks', () => {
  it('registry is accessible and populated', () => {
    const all = PmfMetricRegistry.getAll();
    expect(all.length).toBeGreaterThan(20);
  });

  it('normalizer accepts valid events', () => {
    const normalizer = new ProductEventNormalizer();
    const result = normalizer.normalize({
      eventType: 'discovery',
      action: 'page_view',
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metadata: { page: '/signup', label: 'Signup' },
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it('validator catches PII', () => {
    const validator = new ProductEventValidator();
    const result = validator.validate({
      eventType: 'discovery',
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metadata: { email: 'test@example.com' },
    });
    expect(result.valid).toBe(false);
  });

  it('store accepts and retrieves events', () => {
    const store = new ProductEventStore({ maxEvents: 100 });
    const normalizer = new ProductEventNormalizer();
    const events = normalizer.normalize({
      eventType: 'discovery',
      action: 'page_view',
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metadata: { page: '/signup', label: 'Signup' },
    });
    events.forEach((e) => store.add(e));
    expect(store.getStats().currentSize).toBeGreaterThan(0);
  });

  it('aggregators initialize correctly', () => {
    const funnel = new FunnelAggregator();
    expect(funnel.getCurrentConversion()).toBeDefined();

    const cohort = new CohortBuilder();
    expect(cohort.getCohorts('daily')).toBeDefined();

    const retention = new RetentionAggregator({ d1Days: 1, d7Days: 7, d30Days: 30 });
    expect(retention.getRetention()).toBeDefined();

    const research = new ResearchQualityAggregator();
    expect(research.getAggregated()).toBeDefined();

    const search = new SearchDemandAggregator();
    expect(search.getAggregated()).toBeDefined();
  });

  it('experiment registry validates experiments', () => {
    const registry = new ExperimentRegistry();
    registry.register({
      id: 'test',
      name: 'Test',
      description: 'Test',
      owner: 'Product',
      variants: [{ id: 'control', name: 'Control', trafficPercent: 100 }],
      metrics: ['pmf.activation.signup_completed'],
      startDate: '2024-01-01',
    });
    expect(registry.get('test')).toBeDefined();
  });
});
