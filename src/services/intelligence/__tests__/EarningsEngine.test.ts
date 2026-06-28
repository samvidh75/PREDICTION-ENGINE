/**
 * Earnings Engine Tests
 *
 * Covers: strong earnings, weak earnings, moderate, 5-stock ranking,
 * partial data, edge cases, margin pressure, guidance misses
 */
import { EarningsEngine } from '../engines/EarningsEngine';
import { EarningsMetrics } from '../types';

describe('Earnings Engine', () => {
  const engine = new EarningsEngine();

  test('should score strong earnings correctly', async () => {
    const metrics: EarningsMetrics = {
      history: [
        { quarter: 'Q1FY25', eps: 4.2, epsYoY: 18, revenue: 22000, revenueYoY: 17, margin: 20, surprise: 2, guidanceHit: true },
        { quarter: 'Q2FY25', eps: 4.5, epsYoY: 20, revenue: 23500, revenueYoY: 19, margin: 21, surprise: 3, guidanceHit: true },
        { quarter: 'Q3FY25', eps: 4.8, epsYoY: 22, revenue: 24800, revenueYoY: 21, margin: 22, surprise: 2, guidanceHit: true },
        { quarter: 'Q4FY25', eps: 5.1, epsYoY: 24, revenue: 26200, revenueYoY: 23, margin: 23, surprise: 4, guidanceHit: true },
        { quarter: 'Q1FY26', eps: 5.5, epsYoY: 25, revenue: 27800, revenueYoY: 24, margin: 24, surprise: 3, guidanceHit: true },
        { quarter: 'Q2FY26', eps: 5.9, epsYoY: 27, revenue: 29500, revenueYoY: 26, margin: 25, surprise: 2, guidanceHit: true },
        { quarter: 'Q3FY26', eps: 6.3, epsYoY: 28, revenue: 31200, revenueYoY: 27, margin: 26, surprise: 5, guidanceHit: true },
        { quarter: 'Q4FY26', eps: 6.8, epsYoY: 30, revenue: 33000, revenueYoY: 29, margin: 27, surprise: 4, guidanceHit: true },
      ],
      currentGuidance: { epsGrowth: 22, revenueGrowth: 18 },
      forwardPE: 22,
      peg: 0.9,
      oneTimeItems: 1,
      fcfMargin: 15,
      lastUpdated: new Date(),
      fiscalYear: 2026,
    };

    const result = await engine.analyze(metrics);

    expect(result.overall).toBeGreaterThanOrEqual(80);
    expect(result.earningsQuality).toBe('excellent');
    expect(result.beatStreak).toBeGreaterThanOrEqual(3);
  });

  test('should score weak earnings correctly', async () => {
    const metrics: EarningsMetrics = {
      history: [
        { quarter: 'Q1FY26', eps: 3.5, epsYoY: 2, revenue: 20000, revenueYoY: -1, margin: 15, surprise: -2, guidanceHit: false },
        { quarter: 'Q2FY26', eps: 3.4, epsYoY: 1, revenue: 19500, revenueYoY: -2, margin: 14, surprise: -3, guidanceHit: false },
      ],
      currentGuidance: { epsGrowth: 3, revenueGrowth: 0 },
      forwardPE: 35,
      peg: 11,
      oneTimeItems: 8,
      fcfMargin: 2,
      lastUpdated: new Date(),
      fiscalYear: 2026,
    };

    const result = await engine.analyze(metrics);

    expect(result.overall).toBeLessThanOrEqual(35);
    expect(result.earningsQuality).toBe('weak');
  });

  test('should rank 5 stocks by earnings quality', async () => {
    const stocks: [string, EarningsMetrics][] = [
      ['STRONG', {
        history: [
          { quarter: 'Q1FY26', eps: 10, epsYoY: 30, revenue: 50000, revenueYoY: 20, margin: 25, surprise: 5, guidanceHit: true },
          { quarter: 'Q2FY26', eps: 11, epsYoY: 32, revenue: 52000, revenueYoY: 22, margin: 26, surprise: 4, guidanceHit: true },
          { quarter: 'Q3FY26', eps: 12, epsYoY: 34, revenue: 55000, revenueYoY: 24, margin: 27, surprise: 6, guidanceHit: true },
          { quarter: 'Q4FY26', eps: 13, epsYoY: 35, revenue: 58000, revenueYoY: 25, margin: 28, surprise: 5, guidanceHit: true },
        ],
        currentGuidance: { epsGrowth: 25, revenueGrowth: 20 },
        forwardPE: 18, peg: 0.7, oneTimeItems: 0.5, fcfMargin: 20,
        lastUpdated: new Date(), fiscalYear: 2026,
      }],
      ['GOOD', {
        history: [
          { quarter: 'Q1FY26', eps: 5, epsYoY: 15, revenue: 25000, revenueYoY: 12, margin: 18, surprise: 2, guidanceHit: true },
          { quarter: 'Q2FY26', eps: 5.2, epsYoY: 16, revenue: 26000, revenueYoY: 11, margin: 19, surprise: 1, guidanceHit: true },
          { quarter: 'Q3FY26', eps: 5.5, epsYoY: 14, revenue: 27000, revenueYoY: 10, margin: 20, surprise: 3, guidanceHit: false },
          { quarter: 'Q4FY26', eps: 5.8, epsYoY: 17, revenue: 28000, revenueYoY: 13, margin: 21, surprise: 2, guidanceHit: true },
        ],
        currentGuidance: { epsGrowth: 12, revenueGrowth: 10 },
        forwardPE: 22, peg: 1.3, oneTimeItems: 3, fcfMargin: 10,
        lastUpdated: new Date(), fiscalYear: 2026,
      }],
      ['AVERAGE', {
        history: [
          { quarter: 'Q1FY26', eps: 2, epsYoY: 8, revenue: 10000, revenueYoY: 5, margin: 12, surprise: 0.5, guidanceHit: true },
          { quarter: 'Q2FY26', eps: 2.1, epsYoY: 7, revenue: 10500, revenueYoY: 6, margin: 11, surprise: -1, guidanceHit: false },
          { quarter: 'Q3FY26', eps: 2.2, epsYoY: 9, revenue: 10800, revenueYoY: 4, margin: 13, surprise: 1, guidanceHit: true },
          { quarter: 'Q4FY26', eps: 2.3, epsYoY: 6, revenue: 11200, revenueYoY: 7, margin: 12, surprise: -2, guidanceHit: false },
        ],
        currentGuidance: { epsGrowth: 8, revenueGrowth: 6 },
        forwardPE: 28, peg: 2.5, oneTimeItems: 6, fcfMargin: 5,
        lastUpdated: new Date(), fiscalYear: 2026,
      }],
      ['WEAK', {
        history: [
          { quarter: 'Q1FY26', eps: 1, epsYoY: -2, revenue: 5000, revenueYoY: -5, margin: 5, surprise: -3, guidanceHit: false },
          { quarter: 'Q2FY26', eps: 0.9, epsYoY: -3, revenue: 4800, revenueYoY: -8, margin: 4, surprise: -4, guidanceHit: false },
        ],
        currentGuidance: { epsGrowth: -5, revenueGrowth: -3 },
        forwardPE: 40, peg: -3, oneTimeItems: 15, fcfMargin: -2,
        lastUpdated: new Date(), fiscalYear: 2026,
      }],
      ['DECELERATING', {
        history: [
          { quarter: 'Q1FY26', eps: 3, epsYoY: 20, revenue: 15000, revenueYoY: 18, margin: 20, surprise: 1, guidanceHit: true },
          { quarter: 'Q2FY26', eps: 3.1, epsYoY: 15, revenue: 15500, revenueYoY: 12, margin: 19, surprise: -1, guidanceHit: true },
          { quarter: 'Q3FY26', eps: 3.2, epsYoY: 10, revenue: 15800, revenueYoY: 8, margin: 18, surprise: -2, guidanceHit: false },
          { quarter: 'Q4FY26', eps: 3.3, epsYoY: 5, revenue: 16000, revenueYoY: 3, margin: 17, surprise: -3, guidanceHit: false },
        ],
        currentGuidance: { epsGrowth: 3, revenueGrowth: 2 },
        forwardPE: 30, peg: 4, oneTimeItems: 8, fcfMargin: 3,
        lastUpdated: new Date(), fiscalYear: 2026,
      }],
    ];

    const results = await Promise.all(
      stocks.map(async ([name, metrics]) => {
        const score = await engine.analyze(metrics);
        return { name, overall: score.overall, quality: score.earningsQuality };
      })
    );

    results.sort((a, b) => b.overall - a.overall);

    console.log('Earnings Ranking:', results.map(r => `${r.name}: ${r.overall} (${r.quality})`).join(' | '));

    expect(results[0].name).toBe('STRONG');
    expect(results[results.length - 1].name).toBe('WEAK');
    expect(results[0].overall).toBeGreaterThan(results[results.length - 1].overall + 40);
  });

  test('should handle partial data with limited history', async () => {
    const metrics: EarningsMetrics = {
      history: [
        { quarter: 'Q1FY26', eps: 5, epsYoY: 15, revenue: 25000, revenueYoY: 10, margin: 20, surprise: 2, guidanceHit: true },
      ],
      currentGuidance: { epsGrowth: 12, revenueGrowth: 10 },
      forwardPE: 25,
      lastUpdated: new Date(),
      fiscalYear: 2026,
    };

    const result = await engine.analyze(metrics);

    expect(result.overall).toBeGreaterThan(0);
    expect(result.dataCompleteness).toBeLessThan(0.5);
    expect(result.confidence).toBeLessThan(0.8);
  });

  test('should handle empty history gracefully', async () => {
    const metrics: EarningsMetrics = {
      history: [],
      currentGuidance: { epsGrowth: 0, revenueGrowth: 0 },
      lastUpdated: new Date(),
      fiscalYear: 2026,
    };

    const result = await engine.analyze(metrics);

    expect(result.overall).toBeDefined();
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(15);
    expect(result.dataCompleteness).toBeGreaterThanOrEqual(0.3);
  });

  test('should detect decelerating growth trend', async () => {
    const metrics: EarningsMetrics = {
      history: [
        { quarter: 'Q1FY25', eps: 5, epsYoY: 30, revenue: 20000, revenueYoY: 25, margin: 22, surprise: 3, guidanceHit: true },
        { quarter: 'Q2FY25', eps: 5.3, epsYoY: 25, revenue: 21000, revenueYoY: 20, margin: 21, surprise: 2, guidanceHit: true },
        { quarter: 'Q3FY25', eps: 5.5, epsYoY: 18, revenue: 21500, revenueYoY: 15, margin: 20, surprise: 1, guidanceHit: true },
        { quarter: 'Q4FY25', eps: 5.7, epsYoY: 12, revenue: 22000, revenueYoY: 10, margin: 19, surprise: 0, guidanceHit: true },
        { quarter: 'Q1FY26', eps: 5.9, epsYoY: 8, revenue: 22400, revenueYoY: 6, margin: 18, surprise: -1, guidanceHit: false },
        { quarter: 'Q2FY26', eps: 6.0, epsYoY: 5, revenue: 22600, revenueYoY: 3, margin: 17, surprise: -2, guidanceHit: false },
      ],
      currentGuidance: { epsGrowth: 3, revenueGrowth: 2 },
      forwardPE: 20,
      lastUpdated: new Date(),
      fiscalYear: 2026,
    };

    const result = await engine.analyze(metrics);

    expect(result.epsGrowthTrend).toBe('decelerating');
    expect(result.overall).toBeLessThan(75);
  });

  test('should produce valid reasoning and all output fields', async () => {
    const metrics: EarningsMetrics = {
      history: [
        { quarter: 'Q1FY26', eps: 5, epsYoY: 15, revenue: 25000, revenueYoY: 12, margin: 20, surprise: 2, guidanceHit: true },
        { quarter: 'Q2FY26', eps: 5.2, epsYoY: 16, revenue: 26000, revenueYoY: 13, margin: 21, surprise: 1, guidanceHit: true },
        { quarter: 'Q3FY26', eps: 5.5, epsYoY: 14, revenue: 27000, revenueYoY: 11, margin: 22, surprise: 3, guidanceHit: false },
        { quarter: 'Q4FY26', eps: 5.8, epsYoY: 17, revenue: 28000, revenueYoY: 14, margin: 23, surprise: 2, guidanceHit: true },
      ],
      currentGuidance: { epsGrowth: 14, revenueGrowth: 12 },
      forwardPE: 24,
      peg: 1.5,
      oneTimeItems: 2.5,
      fcfMargin: 12,
      lastUpdated: new Date(),
      fiscalYear: 2026,
    };

    const result = await engine.analyze(metrics);

    // All fields populated
    expect(result.overall).toBeGreaterThan(0);
    expect(result.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(result.forwardScore).toBeGreaterThanOrEqual(0);
    expect(result.beatScore).toBeGreaterThanOrEqual(0);
    expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    expect(result.guidanceScore).toBeGreaterThanOrEqual(0);
    expect(result.epsGrowth5Y).toBeDefined();
    expect(['accelerating', 'decelerating', 'stable']).toContain(result.epsGrowthTrend);
    expect(result.beatStreak).toBeGreaterThanOrEqual(0);
    expect(result.missStreak).toBeGreaterThanOrEqual(0);
    expect(['excellent', 'good', 'average', 'weak']).toContain(result.earningsQuality);
    expect(['solid', 'adequate', 'concerning']).toContain(result.revenueQuality);
    expect(result.details.avgSurprise).toBeDefined();
    expect(result.details.volatility).toBeDefined();
    expect(result.details.guidanceAccuracy).toBeGreaterThanOrEqual(0);
    expect(result.details.recent8Quarters.length).toBeLessThanOrEqual(4);
    expect(result.dataCompleteness).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(result.timestamp).toBeInstanceOf(Date);
  });
});
