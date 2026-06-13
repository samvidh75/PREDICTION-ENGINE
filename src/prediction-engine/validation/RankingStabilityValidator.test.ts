import { describe, it, expect } from 'vitest';
import { RankingStabilityValidator } from './RankingStabilityValidator';
import { UnifiedPredictionOutput, UnifiedClassification, UnifiedConfidenceLevel, UnifiedHorizon } from '../types';

function makeOutput(overrides: Partial<UnifiedPredictionOutput>): UnifiedPredictionOutput {
  return {
    symbol: 'TEST',
    horizon: 90 as UnifiedHorizon,
    tradeDate: '2026-06-14',
    generatedAt: '2026-06-14T00:00:00.000Z',
    modelVersion: '1.0.0',
    rankingScore: 75,
    healthScore: 75,
    classification: 'HEALTHY' as UnifiedClassification,
    confidenceScore: 85,
    confidenceLevel: 'HIGH' as UnifiedConfidenceLevel,
    factorScores: [],
    featureVector: [],
    dataCompleteness: 100,
    missingFields: [],
    unavailableFeatures: [],
    explanation: '',
    keyStrengths: [],
    keyWeaknesses: [],
    keyRisks: [],
    sourceEngine: 'UnifiedPredictionEngine',
    createdBy: 'system',
    ...overrides,
  };
}

describe('RankingStabilityValidator', () => {
  const validator = new RankingStabilityValidator();

  describe('validateStability', () => {
    it('identical outputs produce perfect stability', () => {
      const outputs = [
        makeOutput({ symbol: 'AAPL', rankingScore: 80, classification: 'EXCELLENT' }),
        makeOutput({ symbol: 'AAPL', rankingScore: 80, classification: 'EXCELLENT' }),
        makeOutput({ symbol: 'AAPL', rankingScore: 80, classification: 'EXCELLENT' }),
      ];
      const result = validator.validateStability(outputs);
      expect(result.averageScoreChange).toBe(0);
      expect(result.maxScoreChange).toBe(0);
      expect(result.classificationFlipRate).toBe(0);
      expect(result.overallStabilityScore).toBeGreaterThanOrEqual(90);
    });

    it('wildly different outputs produce low stability', () => {
      const outputs = [
        makeOutput({ symbol: 'AAPL', rankingScore: 90, classification: 'EXCELLENT' }),
        makeOutput({ symbol: 'AAPL', rankingScore: 20, classification: 'AT_RISK' }),
        makeOutput({ symbol: 'AAPL', rankingScore: 85, classification: 'EXCELLENT' }),
      ];
      const result = validator.validateStability(outputs);
      expect(result.averageScoreChange).toBeGreaterThan(30);
      expect(result.maxScoreChange).toBeGreaterThan(60);
      expect(result.overallStabilityScore).toBeLessThan(60);
    });

    it('handles single output gracefully', () => {
      const outputs = [makeOutput({ symbol: 'AAPL' })];
      const result = validator.validateStability(outputs);
      expect(result.overallStabilityScore).toBe(100);
    });

    it('handles empty array', () => {
      const result = validator.validateStability([]);
      expect(result.overallStabilityScore).toBe(100);
    });
  });

  describe('detectScoreCollapse', () => {
    it('detects collapsed scores', () => {
      const scores = [50, 51, 50, 49, 50, 51, 50, 49, 50];
      expect(validator.detectScoreCollapse(scores)).toBe(true);
    });

    it('returns false for well-distributed scores', () => {
      const scores = [10, 25, 50, 75, 90, 30, 60, 80, 45, 70];
      expect(validator.detectScoreCollapse(scores)).toBe(false);
    });

    it('returns false for fewer than 5 scores', () => {
      expect(validator.detectScoreCollapse([50, 51, 50])).toBe(false);
    });
  });

  describe('rankCorrelation', () => {
    it('is symmetric', () => {
      const previous = [
        makeOutput({ symbol: 'AAPL', rankingScore: 90 }),
        makeOutput({ symbol: 'MSFT', rankingScore: 80 }),
        makeOutput({ symbol: 'GOOG', rankingScore: 70 }),
      ];
      const current = [
        makeOutput({ symbol: 'AAPL', rankingScore: 85 }),
        makeOutput({ symbol: 'MSFT', rankingScore: 75 }),
        makeOutput({ symbol: 'GOOG', rankingScore: 95 }),
      ];
      const r1 = validator.rankCorrelation(current, previous);
      const r2 = validator.rankCorrelation(previous, current);
      expect(r1).toBe(r2);
    });

    it('returns 1 for identical rankings', () => {
      const current = [
        makeOutput({ symbol: 'AAPL', rankingScore: 90 }),
        makeOutput({ symbol: 'MSFT', rankingScore: 80 }),
        makeOutput({ symbol: 'GOOG', rankingScore: 70 }),
      ];
      const previous = [
        makeOutput({ symbol: 'AAPL', rankingScore: 90 }),
        makeOutput({ symbol: 'MSFT', rankingScore: 80 }),
        makeOutput({ symbol: 'GOOG', rankingScore: 70 }),
      ];
      const r = validator.rankCorrelation(current, previous);
      expect(r).toBeCloseTo(1, 2);
    });

    it('returns near -1 for reversed rankings', () => {
      const current = [
        makeOutput({ symbol: 'AAPL', rankingScore: 90 }),
        makeOutput({ symbol: 'MSFT', rankingScore: 80 }),
        makeOutput({ symbol: 'GOOG', rankingScore: 70 }),
      ];
      const previous = [
        makeOutput({ symbol: 'GOOG', rankingScore: 90 }),
        makeOutput({ symbol: 'MSFT', rankingScore: 80 }),
        makeOutput({ symbol: 'AAPL', rankingScore: 70 }),
      ];
      const r = validator.rankCorrelation(current, previous);
      expect(r).toBeLessThan(0);
    });

    it('handles non-overlapping symbols', () => {
      const current = [makeOutput({ symbol: 'AAPL', rankingScore: 90 })];
      const previous = [makeOutput({ symbol: 'MSFT', rankingScore: 80 })];
      expect(validator.rankCorrelation(current, previous)).toBe(0);
    });
  });
});
