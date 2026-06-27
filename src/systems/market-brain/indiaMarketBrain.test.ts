import { describe, expect, it } from 'vitest';
import { evaluateIndiaEquity, type IndiaEquityPacket } from './indiaMarketBrain';

const readyEvidence: IndiaEquityPacket['evidence'] = {
  instrument_master: 'ready',
  prices: 'ready',
  fundamentals: 'ready',
  financial_statements: 'ready',
  technicals: 'ready',
  sector_context: 'ready',
};

const strongPacket: IndiaEquityPacket = {
  symbol: 'sample',
  companyName: 'Sample Industries Limited',
  asOf: '2026-06-27',
  evidence: readyEvidence,
  fundamentals: {
    peRatio: 22,
    pbRatio: 5,
    evEbitda: 16,
    roe: 28,
    roa: 18,
    roic: 30,
    revenueGrowth: 14,
    profitGrowth: 18,
    operatingMargin: 26,
    debtToEquity: 0.1,
    currentRatio: 2.1,
    fcfYield: 5,
    marketCap: 13_000_000_000_000,
  },
  technicals: {
    momentum: 18,
    relativeStrength: 14,
    volatility: 18,
    rsi: 61,
    trendStrength: 14,
  },
  ownership: {
    promoterHolding: 72,
    promoterPledge: 0,
    fiiHolding: 12,
    diiHolding: 9,
  },
};

describe('evaluateIndiaEquity', () => {
  it('returns a strong research state when factor evidence is strong and risk is contained', () => {
    const result = evaluateIndiaEquity(strongPacket);

    expect(result.symbol).toBe('SAMPLE');
    expect(result.researchState).toBe('High conviction');
    expect(result.convictionScore).toBeGreaterThanOrEqual(78);
    expect(result.quality.score).toBeGreaterThanOrEqual(80);
    expect(result.risk.score).toBeLessThanOrEqual(35);
    expect(result.thesis.length).toBeGreaterThan(0);
    expect(result.complianceNote).toContain('Research-only');
  });

  it('trims and uppercases symbols before returning engine output', () => {
    const result = evaluateIndiaEquity({
      ...strongPacket,
      symbol: ' sample ',
    });

    expect(result.symbol).toBe('SAMPLE');
  });

  it('marks output for review when required evidence domains are missing', () => {
    const result = evaluateIndiaEquity({
      symbol: 'sample',
      companyName: 'Sample Industries Limited',
      asOf: '2026-06-27',
      evidence: {
        instrument_master: 'ready',
        prices: 'missing',
        fundamentals: 'missing',
        financial_statements: 'partial',
        technicals: 'missing',
        sector_context: 'missing',
      },
      fundamentals: {},
      technicals: {},
    });

    expect(result.researchState).toBe('Needs review');
    expect(result.missingEvidence).toEqual([
      'prices',
      'fundamentals',
      'technicals',
      'sector_context',
    ]);
    expect(result.thesis[0]).toContain('More research evidence');
  });

  it('does not treat partial required evidence as missing', () => {
    const result = evaluateIndiaEquity({
      ...strongPacket,
      evidence: {
        ...readyEvidence,
        financial_statements: 'partial',
        sector_context: 'partial',
      },
    });

    expect(result.missingEvidence).toEqual([]);
    expect(result.researchState).toBe('High conviction');
  });

  it('raises the risk state when major risk inputs are elevated', () => {
    const result = evaluateIndiaEquity({
      symbol: 'sample',
      companyName: 'Sample Industries Limited',
      asOf: '2026-06-27',
      evidence: readyEvidence,
      fundamentals: {
        debtToEquity: 2.8,
        roe: 4,
        roic: 3,
        operatingMargin: 5,
        peRatio: 80,
      },
      technicals: {
        volatility: 70,
        momentum: -12,
        relativeStrength: -10,
        rsi: 78,
      },
      ownership: {
        promoterPledge: 35,
      },
    });

    expect(result.researchState).toBe('Risk rising');
    expect(result.risk.score).toBeGreaterThanOrEqual(72);
    expect(result.risksToReview).toContain('Promoter pledge is a governance risk to review.');
    expect(result.risksToReview).toContain('Leverage risk is elevated.');
  });
});
