import { describe, expect, it } from 'vitest';
import { evaluateIndiaEquity } from './indiaMarketBrain';
import { toMarketBrainResearchView } from './researchContract';

const basePacket = {
  symbol: 'SAMPLE',
  companyName: 'Sample Limited',
  sector: 'General',
  asOf: '2026-06-27',
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
};

describe('toMarketBrainResearchView', () => {
  it('creates a product-safe research view from output', () => {
    const result = evaluateIndiaEquity({
      ...basePacket,
      evidence: {
        instrument_master: 'ready',
        prices: 'ready',
        fundamentals: 'ready',
        financial_statements: 'ready',
        technicals: 'ready',
        sector_context: 'ready',
      },
    });

    const view = toMarketBrainResearchView(result);

    expect(view.symbol).toBe('SAMPLE');
    expect(view.headline).toContain('conviction');
    expect(view.factorViews).toHaveLength(7);
    expect(view.methodNote).toContain('Research-only');
    expect(view.evidenceReview.needsReview).toBe(false);
    expect(view.evidenceReview.summary).toBe('Required research evidence is available for this view.');
  });

  it('uses the shared narrative fallback for empty research risk bullets', () => {
    const result = evaluateIndiaEquity({
      ...basePacket,
      evidence: {
        instrument_master: 'ready',
        prices: 'ready',
        fundamentals: 'ready',
        financial_statements: 'ready',
        technicals: 'ready',
        sector_context: 'ready',
      },
    });

    const view = toMarketBrainResearchView({
      ...result,
      risksToReview: [],
    });

    expect(view.risksToReview).toEqual(['No dominant signal yet.']);
  });

  it('surfaces partial evidence as review metadata without marking it missing', () => {
    const result = evaluateIndiaEquity({
      ...basePacket,
      evidence: {
        instrument_master: 'ready',
        prices: 'ready',
        fundamentals: 'partial',
        financial_statements: 'ready',
        technicals: 'ready',
        sector_context: 'ready',
      },
    });

    const view = toMarketBrainResearchView(result);

    expect(view.evidenceReview.needsReview).toBe(true);
    expect(view.evidenceReview.partial).toEqual(['fundamentals']);
    expect(view.evidenceReview.missing).toEqual([]);
    expect(view.evidenceReview.summary).toContain('Needs review: fundamentals.');
  });

  it('rejects unsafe factor copy before it can reach frontend surfaces', () => {
    const result = evaluateIndiaEquity({
      ...basePacket,
      evidence: {
        instrument_master: 'ready',
        prices: 'ready',
        fundamentals: 'ready',
        financial_statements: 'ready',
        technicals: 'ready',
        sector_context: 'ready',
      },
    });

    expect(() => toMarketBrainResearchView({
      ...result,
      quality: {
        ...result.quality,
        drivers: ['Strong Buy setup.'],
      },
    })).toThrow('Market brain copy contains recommendation language');
  });
});
