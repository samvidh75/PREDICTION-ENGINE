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

const completeEvidence = {
  instrument_master: 'ready' as const,
  prices: 'ready' as const,
  fundamentals: 'ready' as const,
  financial_statements: 'ready' as const,
  technicals: 'ready' as const,
  sector_context: 'ready' as const,
};

describe('toMarketBrainResearchView', () => {
  it('creates a product-safe research view from output', () => {
    const result = evaluateIndiaEquity({
      ...basePacket,
      evidence: completeEvidence,
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
      evidence: completeEvidence,
    });

    const view = toMarketBrainResearchView({
      ...result,
      risksToReview: [],
    });

    expect(view.risksToReview).toEqual(['No dominant signal yet.']);
  });

  it('uses factor driver, risk, then neutral fallback summaries', () => {
    const result = evaluateIndiaEquity({
      ...basePacket,
      evidence: completeEvidence,
    });

    const view = toMarketBrainResearchView({
      ...result,
      quality: { score: 72, drivers: ['Quality driver copy.'], risks: ['Quality risk copy.'] },
      growth: { score: 38, drivers: [], risks: ['Growth risk copy.'] },
      valuation: { score: 50, drivers: [], risks: [] },
    });

    expect(view.factorViews.find((factor) => factor.key === 'quality')?.summary).toBe('Quality driver copy.');
    expect(view.factorViews.find((factor) => factor.key === 'growth')?.summary).toBe('Growth risk copy.');
    expect(view.factorViews.find((factor) => factor.key === 'valuation')?.summary).toBe('Valuation needs peer and history context.');
  });

  it('surfaces partial evidence as review metadata without marking it missing', () => {
    const result = evaluateIndiaEquity({
      ...basePacket,
      evidence: {
        ...completeEvidence,
        fundamentals: 'partial',
      },
    });

    const view = toMarketBrainResearchView(result);

    expect(view.evidenceReview.needsReview).toBe(true);
    expect(view.evidenceReview.partial).toEqual(['fundamentals']);
    expect(view.evidenceReview.missing).toEqual([]);
    expect(view.evidenceReview.summary).toContain('Needs review: Fundamentals.');
  });

  it('renders public evidence labels without raw domain keys', () => {
    const result = evaluateIndiaEquity({
      ...basePacket,
      evidence: {
        ...completeEvidence,
        fundamentals: 'partial',
        financial_statements: 'missing',
        sector_context: 'missing',
      },
    });

    const view = toMarketBrainResearchView(result);

    expect(view.evidenceReview.summary).toContain('Needs review: Fundamentals.');
    expect(view.evidenceReview.summary).toContain('Unavailable evidence: Financial Statements, Sector Context.');
    expect(view.evidenceReview.summary).not.toContain('financial_statements');
    expect(view.evidenceReview.summary).not.toContain('sector_context');
  });
});
