/**
 * Events Engine Tests
 *
 * Covers: catalyst-rich, limited catalysts, mixed, immediate, full output validation
 */
import { EventEngine } from '../engines/EventEngine';
import { EventMetrics } from '../types';

describe('Events Engine', () => {
  const engine = new EventEngine();

  test('should score catalyst-rich period correctly', async () => {
    const metrics: EventMetrics = {
      events: [
        {
          type: 'earnings',
          description: 'Q2 earnings announcement',
          expectedDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          expectedImpact: 'high',
          direction: 'bullish',
          probability: 0.95,
        },
        {
          type: 'product',
          description: 'New product launch',
          expectedDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          expectedImpact: 'high',
          direction: 'bullish',
          probability: 0.8,
        },
      ],
      nextEarningsDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      bullishEventCount: 2,
      bearishEventCount: 0,
      eventCount90Days: 2,
      pendingDeals: ['Partnership discussions'],
      lastUpdated: new Date(),
      fiscalYear: 2026,
      currency: 'PKR',
    };

    const result = await engine.analyze(metrics);

    expect(result.overall).toBeGreaterThanOrEqual(60);
    expect(result.opportunityWindow).toBe('immediate');
    expect(result.catalystDirection).toBe('bullish');
    expect(result.upcomingEvents.length).toBeGreaterThan(0);
  });

  test('should score limited catalysts correctly', async () => {
    const metrics: EventMetrics = {
      events: [],
      eventCount90Days: 0,
      bullishEventCount: 0,
      bearishEventCount: 0,
      lastUpdated: new Date(),
      fiscalYear: 2026,
      currency: 'PKR',
    };

    const result = await engine.analyze(metrics);

    expect(result.overall).toBeLessThan(40);
    expect(result.opportunityWindow).toBe('limited');
  });

  test('should handle mixed catalysts correctly', async () => {
    const metrics: EventMetrics = {
      events: [
        {
          type: 'earnings',
          description: 'Q2 earnings',
          expectedDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          expectedImpact: 'high',
          direction: 'bullish',
          probability: 0.9,
        },
        {
          type: 'deal',
          description: 'Potential lawsuit settlement',
          expectedDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          expectedImpact: 'medium',
          direction: 'bearish',
          probability: 0.6,
        },
      ],
      nextEarningsDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      bullishEventCount: 1,
      bearishEventCount: 1,
      eventCount90Days: 2,
      lastUpdated: new Date(),
      fiscalYear: 2026,
      currency: 'PKR',
    };

    const result = await engine.analyze(metrics);

    expect(result.overall).toBeGreaterThan(40);
    expect(result.overall).toBeLessThan(70);
    expect(result.catalystDirection).toBe('neutral');
  });

  test('should score immediate catalyst highest', async () => {
    const metrics: EventMetrics = {
      events: [
        {
          type: 'earnings',
          description: 'Q2 earnings tomorrow',
          expectedDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          expectedImpact: 'high',
          direction: 'bullish',
          probability: 0.99,
        },
      ],
      nextEarningsDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      eventCount90Days: 1,
      lastUpdated: new Date(),
      fiscalYear: 2026,
      currency: 'PKR',
    };

    const result = await engine.analyze(metrics);

    expect(result.opportunityWindow).toBe('immediate');
    expect(result.daysToCatalyst).toBeLessThanOrEqual(2);
    expect(result.overall).toBeGreaterThanOrEqual(45);
  });

  test('should produce valid output fields and reasoning', async () => {
    const metrics: EventMetrics = {
      events: [
        {
          type: 'earnings',
          description: 'Q3 earnings',
          expectedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          expectedImpact: 'high',
          direction: 'bullish',
          probability: 0.9,
        },
      ],
      nextEarningsDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      pendingDeals: ['Merger discussion'],
      productLaunchesPlanned: ['Cloud product Q4'],
      bullishEventCount: 1,
      bearishEventCount: 0,
      eventCount90Days: 1,
      lastUpdated: new Date(),
      fiscalYear: 2026,
      currency: 'PKR',
    };

    const result = await engine.analyze(metrics);

    expect(result.overall).toBeGreaterThan(0);
    expect(result.catalystDetectionScore).toBeGreaterThanOrEqual(0);
    expect(result.eventImpactScore).toBeGreaterThanOrEqual(0);
    expect(result.timingProbabilityScore).toBeGreaterThanOrEqual(0);
    expect(result.strategicCatalystScore).toBeGreaterThanOrEqual(0);
    expect(result.catalystRichnessScore).toBeGreaterThanOrEqual(0);
    expect(result.nextCatalyst.length).toBeGreaterThan(0);
    expect(['bullish', 'bearish', 'neutral']).toContain(result.catalystDirection);
    expect(['immediate', 'near_term', 'medium_term', 'distant', 'limited']).toContain(result.opportunityWindow);
    expect(['catalyst_heavy', 'moderate', 'sparse']).toContain(result.catalystRichness);
    expect(result.details.bullishCatalysts).toBeDefined();
    expect(result.details.bearishCatalysts).toBeDefined();
    expect(['high', 'medium', 'low']).toContain(result.details.timingCertainty);
    expect(result.dataCompleteness).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('should handle bearish catalyst dominance', async () => {
    const metrics: EventMetrics = {
      events: [
        {
          type: 'approval',
          description: 'Regulatory crackdown',
          expectedDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
          expectedImpact: 'high',
          direction: 'bearish',
          probability: 0.7,
        },
        {
          type: 'earnings',
          description: 'Weak Q results expected',
          expectedDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          expectedImpact: 'medium',
          direction: 'bearish',
          probability: 0.8,
        },
      ],
      nextEarningsDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      bullishEventCount: 0,
      bearishEventCount: 2,
      eventCount90Days: 2,
      lastUpdated: new Date(),
      fiscalYear: 2026,
      currency: 'PKR',
    };

    const result = await engine.analyze(metrics);

    expect(result.catalystDirection).toBe('bearish');
    expect(result.eventImpactScore).toBeLessThanOrEqual(12);
  });
});
