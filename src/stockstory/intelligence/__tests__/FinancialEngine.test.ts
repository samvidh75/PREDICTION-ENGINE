/**
 * Tests: Financial Engine
 */

import { describe, it, expect } from 'vitest';
import { financialEngine } from '../engines/FinancialEngine';
import type { IntelligenceInput } from '../types';

function mockInput(overrides: Partial<IntelligenceInput['financials']> = {}): IntelligenceInput {
  return {
    symbol: 'TEST',
    exchange: 'PSE_EQ',
    tradeDate: '2025-01-15',
    financials: {
      peRatio: 15, pbRatio: 2, eps: 50, dividendYield: 1.5,
      beta: 1.1, marketCap: 50000, freeFloat: 45,
      fcfYield: 3, evEbitda: 10, roa: 6, roe: 14, roic: 12,
      debtToEquity: 40, currentRatio: 1.8,
      revenueGrowth: 12, profitGrowth: 10, epsGrowth: 15,
      fcfGrowth: 8, grossMargin: 40, operatingMargin: 16,
      netMargin: 10, interestCoverage: 4.5, assetTurnover: 1.2,
      receivablesTurnover: 8, inventoryTurnover: 6,
      operatingCashFlow: 5000, freeCashFlow: 3000, capex: 2000,
      ...overrides,
    },
    technicals: {},
    earnings: {},
    sentiment: { overallScore: null, recentHeadlines: null, avgRecentSentiment: null, mentionVolume: null, positiveRatio: null, negativeRatio: null, neutralRatio: null, trending: null, controversyScore: null },
    sector: { name: 'Technology', sectorStrength: 60, sectorMomentum: 'steady', sectorPe: 20, sectorAvgGrowth: 10, sectorAvgMargin: 15 },
    risks: { auditorChange: false, relatedPartyTransactions: false, pledgedShares: null, promoterHolding: null, institutionalHolding: null, outstandingWarrants: false, esopDilution: null, litigationRisk: null, governanceScore: null },
  };
}

describe('FinancialEngine', () => {
  it('returns high score for strong fundamentals', () => {
    const result = financialEngine.analyze(mockInput());
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.qualityScore).toBeGreaterThanOrEqual(50);
    expect(result.growthScore).toBeGreaterThanOrEqual(50);
    expect(result.reasoning).toBeTruthy();
  });

  it('returns low score for weak fundamentals', () => {
    const result = financialEngine.analyze(mockInput({
      roe: 2, roa: 1, operatingMargin: 2, netMargin: 1,
      revenueGrowth: -5, epsGrowth: -10,
      debtToEquity: 300, currentRatio: 0.5,
    }));
    expect(result.score).toBeLessThanOrEqual(30);
  });

  it('handles null inputs gracefully', () => {
    const result = financialEngine.analyze(mockInput({
      roe: null, roa: null, roic: null,
      operatingMargin: null, netMargin: null,
      revenueGrowth: null, epsGrowth: null, fcfGrowth: null,
      debtToEquity: null, currentRatio: null, interestCoverage: null,
    }));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.dataCompleteness).toBeLessThan(0.5);
  });

  it('returns consistent shape', () => {
    const result = financialEngine.analyze(mockInput());
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('qualityScore');
    expect(result).toHaveProperty('growthScore');
    expect(result).toHaveProperty('debtScore');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('reasoning');
    expect(typeof result.score).toBe('number');
    expect(typeof result.reasoning).toBe('string');
  });
});
