import { describe, expect, it } from 'vitest';
import { evaluateIndiaEquity, type IndiaEquityPacket } from './indiaMarketBrain';
import type { HistoricalSimilarityCase } from './historicalSimilarity';

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

const UNSAFE_PUBLIC_COPY = /Strong Buy|Buy now|Sell now|sure shot|guaranteed|multibagger|provider|API|backend|coverage|freshness|diagnostic|lineage|migration|backfill/i;

function makeHistoricalCases(count: number): HistoricalSimilarityCase[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `case-${index + 1}`,
    symbol: 'sample',
    timeframe: '1d',
    features: {
      priceMovePct: 2 + index * 0.01,
      volumeMultiple: 1.8,
      volatilityMultiple: 1.2,
      sectorMovePct: 0.4,
      indexMovePct: 0.2,
      gapPct: 0.1,
    },
    outcome: {
      label: 'next-session',
      movePct: index % 2 === 0 ? 1.2 : -0.7,
      maxDrawdownPct: -1.1,
    },
  }));
}

describe('evaluateIndiaEquity', () => {
  it('returns a strong research state when factor evidence is strong and risk is contained', () => {
    const result = evaluateIndiaEquity(strongPacket);

    expect(result.symbol).toBe('SAMPLE');
    expect(result.researchState).toBe('High conviction');
    expect(result.convictionScore).toBeGreaterThanOrEqual(78);
    expect(result.quality.score).toBeGreaterThanOrEqual(80);
    expect(result.risk.score).toBeLessThanOrEqual(35);
    expect(result.thesis.length).toBeGreaterThan(0);
    expect(result.anomalyReview).toBeNull();
    expect(result.historicalSimilarityReview).toBeNull();
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

  it('wires anomaly review into thesis and watch items without unsafe public copy', () => {
    const result = evaluateIndiaEquity({
      ...strongPacket,
      anomaly: {
        symbol: 'sample',
        timeframe: '15m',
        priceMovePct: -3.2,
        volumeMultiple: 2.4,
        sectorMovePct: -0.4,
        indexMovePct: -0.2,
      },
    });

    expect(result.anomalyReview?.anomalyType).toBe('Volume-backed price move');
    expect(result.anomalyReview?.severity).toBe('High');
    expect(result.thesis).toContain('The latest market event is classified as volume-backed price move.');
    expect(result.risksToReview).toContain('Recent market behavior needs review before the thesis is strengthened.');
    expect(result.whatToWatch).toContain('Whether the market event persists or fades after more evidence.');

    const rendered = JSON.stringify(result);
    expect(rendered).not.toMatch(UNSAFE_PUBLIC_COPY);
  });

  it('keeps incomplete anomaly review separate from core evidence domains', () => {
    const result = evaluateIndiaEquity({
      ...strongPacket,
      anomaly: {
        symbol: 'sample',
        timeframe: '15m',
        priceMovePct: Number.NaN,
        volumeMultiple: Number.POSITIVE_INFINITY,
        sectorMovePct: null,
        indexMovePct: null,
      },
    });

    expect(result.anomalyReview?.anomalyType).toBe('Incomplete evidence');
    expect(result.anomalyReview?.severity).toBe('Needs review');
    expect(result.anomalyReview?.missingEvidence).toEqual([
      'price move',
      'volume behavior',
      'sector context',
      'index context',
    ]);
    expect(result.missingEvidence).toEqual([]);
    expect(JSON.stringify(result)).not.toMatch(UNSAFE_PUBLIC_COPY);
  });

  it('wires usable historical similarity as research context without unsafe public copy', () => {
    const result = evaluateIndiaEquity({
      ...strongPacket,
      historicalSimilarity: {
        symbol: 'sample',
        timeframe: '1d',
        current: {
          priceMovePct: 2.1,
          volumeMultiple: 1.8,
          volatilityMultiple: 1.2,
          sectorMovePct: 0.4,
          indexMovePct: 0.2,
          gapPct: 0.1,
        },
        cases: makeHistoricalCases(30),
        minSampleSize: 30,
      },
    });

    expect(result.historicalSimilarityReview?.usable).toBe(true);
    expect(result.historicalSimilarityReview?.sampleSize).toBe(30);
    expect(result.thesis).toContain('Similar historical cases are available as research context.');
    expect(result.whatToWatch).toContain('Whether the historical context remains relevant as fresh evidence changes.');
    expect(JSON.stringify(result)).not.toMatch(UNSAFE_PUBLIC_COPY);
  });

  it('keeps undersized historical similarity separate from core evidence domains', () => {
    const result = evaluateIndiaEquity({
      ...strongPacket,
      historicalSimilarity: {
        symbol: 'sample',
        timeframe: '1d',
        current: {
          priceMovePct: 2.1,
          volumeMultiple: 1.8,
        },
        cases: makeHistoricalCases(8),
        minSampleSize: 10,
      },
    });

    expect(result.historicalSimilarityReview?.usable).toBe(false);
    expect(result.historicalSimilarityReview?.medianMovePct).toBeNull();
    expect(result.risksToReview).toContain('Not enough similar historical cases for this view yet.');
    expect(result.missingEvidence).toEqual([]);
    expect(JSON.stringify(result)).not.toMatch(UNSAFE_PUBLIC_COPY);
  });
});
