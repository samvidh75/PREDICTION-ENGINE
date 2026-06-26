import { describe, expect, it } from 'vitest';
import { evaluateIndiaEquity } from './indiaMarketBrain';
import { toMarketBrainResearchView } from './researchContract';

describe('toMarketBrainResearchView', () => {
  it('creates a product-safe research view from output', () => {
    const result = evaluateIndiaEquity({
      symbol: 'SAMPLE',
      companyName: 'Sample Limited',
      sector: 'General',
      asOf: '2026-06-27',
      evidence: {
        instrument_master: 'ready',
        prices: 'ready',
        fundamentals: 'ready',
        financial_statements: 'ready',
        technicals: 'ready',
        sector_context: 'ready',
      },
      fundamentals: {
        peRatio: 21,
        pbRatio: 3,
        evEbitda: 15,
        roe: 18,
        roa: 12,
        roic: 17,
        revenueGrowth: 14,
        profitGrowth: 13,
        operatingMargin: 25,
        debtToEquity: 0.4,
        currentRatio: 1.4,
        fcfYield: 4,
        marketCap: 12000000000000,
      },
      technicals: {
        momentum: 10,
        relativeStrength: 8,
        volatility: 20,
        rsi: 57,
        trendStrength: 10,
      },
    });

    const view = toMarketBrainResearchView(result);

    expect(view.symbol).toBe('SAMPLE');
    expect(view.headline).toContain('conviction');
    expect(view.factorViews).toHaveLength(7);
    expect(view.methodNote).toContain('Research-only');
  });
});
