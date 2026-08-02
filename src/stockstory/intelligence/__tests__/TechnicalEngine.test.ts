/**
 * Tests: Technical Engine
 */

import { describe, it, expect } from 'vitest';
import { technicalEngine } from '../engines/TechnicalEngine';
import type { IntelligenceInput } from '../types';

function mockInput(overrides: Partial<IntelligenceInput['technicals']> = {}): IntelligenceInput {
  return {
    symbol: 'TEST',
    exchange: 'PSE_EQ',
    tradeDate: '2025-01-15',
    financials: {},
    technicals: {
      rsi: 60, macd: 2, macdSignal: 1, macdHistogram: 1,
      adx: 30, atr: 15, bollingerWidth: 8, bollingerPosition: 0.6,
      momentum1m: 5, momentum3m: 12, momentum6m: 18, momentum12m: 25,
      volatility: 25, sma50: 150, sma200: 140,
      sma50Distance: 3, sma200Distance: 7,
      volume: 2000000, avgVolume: 1500000, volumeRatio: 1.3,
      relativeStrength: 55, trendStrength: 60, avgTrueRange: 12,
      ...overrides,
    },
    earnings: {},
    sentiment: { overallScore: null, recentHeadlines: null, avgRecentSentiment: null, mentionVolume: null, positiveRatio: null, negativeRatio: null, neutralRatio: null, trending: null, controversyScore: null },
    sector: { name: 'Technology', sectorStrength: 60, sectorMomentum: 'steady', sectorPe: 20, sectorAvgGrowth: 10, sectorAvgMargin: 15 },
    risks: { auditorChange: false, relatedPartyTransactions: false, pledgedShares: null, promoterHolding: null, institutionalHolding: null, outstandingWarrants: false, esopDilution: null, litigationRisk: null, governanceScore: null },
  };
}

describe('TechnicalEngine', () => {
  it('returns bullish score for strong technicals', () => {
    const result = technicalEngine.analyze(mockInput());
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.patternRecognition).toBeTruthy();
  });

  it('returns lower score for bearish signals', () => {
    const result = technicalEngine.analyze(mockInput({
      rsi: 30, macdHistogram: -2, macd: -1, macdSignal: 0,
      adx: 15, sma50: 100, sma200: 150,
      momentum1m: -10, momentum3m: -15,
      volumeRatio: 0.5,
    }));
    expect(result.score).toBeLessThanOrEqual(40);
  });

  it('handles null inputs gracefully', () => {
    const result = technicalEngine.analyze(mockInput({
      rsi: null, macd: null, adx: null,
      sma50: null, sma200: null,
      momentum1m: null, momentum3m: null,
    }));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('returns all sub-scores', () => {
    const result = technicalEngine.analyze(mockInput());
    expect(typeof result.trendScore).toBe('number');
    expect(typeof result.momentumScore).toBe('number');
    expect(typeof result.volatilityScore).toBe('number');
    expect(typeof result.volumeScore).toBe('number');
  });
});
