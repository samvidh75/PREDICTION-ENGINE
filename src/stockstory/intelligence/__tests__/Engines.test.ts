/**
 * Tests: Valuation Engine, Risk Engine, Sector Engine, News Engine,
 * Earnings Engine, Event Engine, RAG Engine
 */

import { describe, it, expect } from 'vitest';
import { valuationEngine } from '../engines/ValuationEngine';
import { riskEngine } from '../engines/RiskEngine';
import { sectorEngine } from '../engines/SectorEngine';
import { newsEngine } from '../engines/NewsEngine';
import { earningsEngine } from '../engines/EarningsEngine';
import { eventEngine } from '../engines/EventEngine';
import { ragEngine } from '../engines/RAGEngine';
import type { IntelligenceInput } from '../types';

const baseInput: IntelligenceInput = {
  symbol: 'TEST',
  exchange: 'PSE_EQ',
  tradeDate: '2025-01-15',
  financials: {
    peRatio: 15, pbRatio: 2.5, eps: 50, dividendYield: 1.5,
    beta: 1.1, marketCap: 50000, freeFloat: 45,
    fcfYield: 3.5, evEbitda: 10, roa: 6, roe: 14, roic: 12,
    debtToEquity: 40, currentRatio: 1.8,
    revenueGrowth: 12, profitGrowth: 10, epsGrowth: 15, fcfGrowth: 8,
    grossMargin: 40, operatingMargin: 16, netMargin: 10,
    interestCoverage: 4.5, assetTurnover: 1.2,
    receivablesTurnover: 8, inventoryTurnover: 6,
    operatingCashFlow: 5000, freeCashFlow: 3000, capex: 2000,
  },
  technicals: {
    rsi: 55, macd: 1.5, macdSignal: 1, macdHistogram: 0.5,
    adx: 25, atr: 12, bollingerWidth: 8, bollingerPosition: 0.5,
    momentum1m: 3, momentum3m: 8, momentum6m: 12, momentum12m: 18,
    volatility: 28, sma50: 145, sma200: 138,
    sma50Distance: 2, sma200Distance: 5,
    volume: 1800000, avgVolume: 1500000, volumeRatio: 1.2,
    relativeStrength: 52, trendStrength: 55, avgTrueRange: 10,
  },
  earnings: {
    epsTtm: 50, epsGrowthQoq: 8, revenueGrowthQoq: 6,
    surprisePercent: 5, beatMiss: 'beat', peTtm: 15, forwardPe: 13,
    pegRatio: 1.2, estimatesAvailable: true,
    nextEarningsDate: '2027-04-15', recentEarningsDate: '2025-01-10',
    fiscalQuarter: 'Q3', fiscalYear: 2025,
  },
  sentiment: {
    overallScore: 0.7, recentHeadlines: 12,
    avgRecentSentiment: 0.6, mentionVolume: 100,
    positiveRatio: 0.65, negativeRatio: 0.2, neutralRatio: 0.15,
    trending: true, controversyScore: 0.1,
  },
  sector: {
    name: 'Technology', sectorStrength: 65,
    sectorMomentum: 'accelerating', sectorPe: 22,
    sectorAvgGrowth: 10, sectorAvgMargin: 18,
  },
  risks: {
    auditorChange: false, relatedPartyTransactions: false,
    pledgedShares: 15, promoterHolding: 55, institutionalHolding: 25,
    outstandingWarrants: false, esopDilution: 2,
    litigationRisk: 0.1, governanceScore: 70,
  },
};

describe('ValuationEngine', () => {
  it('scores attractive valuations higher', () => {
    const result = valuationEngine.analyze(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.peScore).toBeGreaterThanOrEqual(0);
    expect(result.reasoning).toBeTruthy();
  });

  it('scores expensive valuations lower', () => {
    const expensive = valuationEngine.analyze({
      ...baseInput,
      financials: { ...baseInput.financials, peRatio: 80, pbRatio: 12, evEbitda: 35, fcfYield: 0.5, dividendYield: 0.1 },
    });
    expect(expensive.score).toBeLessThan(50);
  });

  it('handles missing data', () => {
    const result = valuationEngine.analyze({
      ...baseInput,
      financials: { ...baseInput.financials, peRatio: null, pbRatio: null, evEbitda: null, fcfYield: null, dividendYield: null },
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe('RiskEngine', () => {
  it('returns low risk for healthy companies', () => {
    const result = riskEngine.analyze(baseInput);
    expect(result.score).toBeLessThan(40);
  });

  it('returns high risk for stressed companies', () => {
    const stressed = riskEngine.analyze({
      ...baseInput,
      financials: { ...baseInput.financials, debtToEquity: 250, currentRatio: 0.5, interestCoverage: 0.8 },
      risks: { ...baseInput.risks, auditorChange: true, relatedPartyTransactions: true, pledgedShares: 70, litigationRisk: 0.8, governanceScore: 20 },
      technicals: { ...baseInput.technicals, volatility: 70, beta: 2.0 },
    });
    expect(stressed.score).toBeGreaterThanOrEqual(50);
    expect(stressed.redFlagCount).toBeGreaterThanOrEqual(3);
  });
});

describe('SectorEngine', () => {
  it('scores sector position', () => {
    const result = sectorEngine.analyze(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.sectorStrength).toBeGreaterThanOrEqual(0);
    expect(result.reasoning).toContain('Technology');
  });
});

describe('NewsEngine', () => {
  it('scores positive sentiment higher', () => {
    const result = newsEngine.analyze(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.headlineCount).toBe(12);
    expect(result.avgSentiment).toBeGreaterThan(0);
  });

  it('scores negative sentiment lower', () => {
    const negative = newsEngine.analyze({
      ...baseInput,
      sentiment: { ...baseInput.sentiment, overallScore: -0.6, avgRecentSentiment: -0.4, positiveRatio: 0.1, negativeRatio: 0.7, controversyScore: 0.8 },
    });
    expect(negative.score).toBeLessThan(40);
  });
});

describe('EarningsEngine', () => {
  it('scores earnings quality', () => {
    const result = earningsEngine.analyze(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.recentSurprise).toBe('beat');
    expect(result.revenueTrend).toBe('growing');
  });

  it('returns next earnings days', () => {
    const result = earningsEngine.analyze(baseInput);
    expect(result.nextEarningsDays).toBeGreaterThan(0);
  });
});

describe('EventEngine', () => {
  it('identifies upcoming catalysts', () => {
    const result = eventEngine.analyze(baseInput);
    expect(result.upcomingCatalysts.length).toBeGreaterThanOrEqual(1);
    expect(result.reasoning).toContain('Event');
  });

  it('detects elevated event risk', () => {
    const risky = eventEngine.analyze({
      ...baseInput,
      risks: { ...baseInput.risks, auditorChange: true, relatedPartyTransactions: true, litigationRisk: 0.9 },
    });
    expect(risky.eventRisk).toBeGreaterThan(40);
  });
});

describe('RAGEngine', () => {
  it('returns deterministic fallback when no vector store', () => {
    const result = ragEngine.analyze(baseInput);
    expect(result.knowledgeCoverage).toBeGreaterThan(0);
    expect(result.relevantPatterns.length).toBeGreaterThan(0);
    expect(result.reasoning).toContain('Vector store not available');
  });

  it('uses vector store when provided', () => {
    const vs = {
      query: (_text: string, _topK: number) => [
        { content: 'Test pattern 1', score: 0.9, source: 'test' },
        { content: 'Test pattern 2', score: 0.8, source: 'test' },
        { content: 'Competitor insight 1', score: 0.7, source: 'test' },
        { content: 'Macro context 1', score: 0.6, source: 'test' },
        { content: 'Extra doc', score: 0.5, source: 'test' },
      ],
    };
    const result = ragEngine.analyze(baseInput, vs);
    expect(result.knowledgeCoverage).toBeGreaterThan(0.5);
    expect(result.relevantPatterns.length).toBeGreaterThanOrEqual(1);
  });
});
