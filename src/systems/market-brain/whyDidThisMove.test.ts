// src/systems/market-brain/whyDidThisMove.test.ts
// Phase 9 — "Why Did This Move" service tests.

import { describe, expect, it } from 'vitest';
import { buildWhyDidThisMoveResult } from './whyDidThisMove';
import type { WhyDidThisMoveInput, MoveDirection, MoveConfidence } from './whyDidThisMove';

describe('buildWhyDidThisMoveResult', () => {
  const baseInput: WhyDidThisMoveInput = {
    symbol: 'TCS',
    companyName: 'TCS',
    anomalyReview: null,
    historicalSimilarityReview: null,
    evidencePack: null,
    adapterEvidenceState: null,
    fundamentals: null,
  };

  it('returns insufficient confidence when no anomaly evidence exists', () => {
    const result = buildWhyDidThisMoveResult(baseInput);

    expect(result.direction).toBe('sideways');
    expect(result.confidence).toBe('insufficient');
    expect(result.magnitudePct).toBeNull();
    expect(result.contributingFactors.length).toBeGreaterThanOrEqual(1);
    expect(result.risksToThesis.length).toBeGreaterThanOrEqual(1);
    expect(result.keyLevels.length).toBeGreaterThanOrEqual(1);
    expect(result.neededContext.length).toBeGreaterThanOrEqual(1);
    expect(result.summary).toContain('Insufficient evidence');
    expect(result.primaryDriver).toContain('Insufficient evidence');
  });

  it('returns strong confidence for High anomaly severity', () => {
    const result = buildWhyDidThisMoveResult({
      ...baseInput,
      anomalyReview: {
        anomalyType: 'Volume-backed price move',
        severity: 'High',
        evidence: ['Price moved 5.2% on 3.8x average volume.'],
        missingEvidence: [],
        narrativePromptPayload: {},
      },
    });

    expect(result.confidence).toBe('strong');
    expect(result.direction).toBe('up');
    expect(result.magnitudePct).toBe(5.0);
    expect(result.primaryDriver).toContain('volume-backed price move');
  });

  it('returns moderate confidence for Medium anomaly severity', () => {
    const result = buildWhyDidThisMoveResult({
      ...baseInput,
      anomalyReview: {
        anomalyType: 'Market-aligned move',
        severity: 'Medium',
        evidence: ['Move correlates with sector movement.'],
        missingEvidence: ['Volume context'],
        narrativePromptPayload: {},
      },
    });

    expect(result.confidence).toBe('moderate');
    expect(result.direction).toBe('sideways');
    expect(result.magnitudePct).toBe(2.5);
  });

  it('returns weak confidence for Low anomaly severity', () => {
    const result = buildWhyDidThisMoveResult({
      ...baseInput,
      anomalyReview: {
        anomalyType: 'Gap move',
        severity: 'Low',
        evidence: ['Opening gap of 1.1%.'],
        missingEvidence: ['Volume context', 'Sector context'],
        narrativePromptPayload: {},
      },
    });

    expect(result.confidence).toBe('weak');
    expect(result.direction).toBe('mixed');
  });

  it('incorporates historical similarity when anomaly is absent', () => {
    const result = buildWhyDidThisMoveResult({
      ...baseInput,
      historicalSimilarityReview: {
        usable: true,
        needsReview: false,
        sampleSize: 45,
        minSampleSize: 30,
        matchedCaseIds: ['case-1', 'case-2'],
        matchedCases: [],
        medianMovePct: 3.2,
        medianMaxDrawdownPct: -1.5,
        positiveCaseShare: 0.62,
        observations: ['Similar patterns led to a median 3.2% move.'],
        limitations: [],
      },
    });

    expect(result.primaryDriver).toContain('similar patterns');
    expect(result.contributingFactors.length).toBeGreaterThanOrEqual(1);
  });

  it('includes contributing evidence from evidence pack', () => {
    const result = buildWhyDidThisMoveResult({
      ...baseInput,
      anomalyReview: {
        anomalyType: 'Delivery-supported move',
        severity: 'Medium',
        evidence: ['Delivery volume was 65% of traded quantity.'],
        missingEvidence: [],
        narrativePromptPayload: {},
      },
      evidencePack: {
        symbol: 'TCS',
        generatedAt: new Date().toISOString(),
        items: [],
        availableDomains: ['price_volume', 'ownership', 'news_events'],
        missingDomains: [],
        partialDomains: [],
        needsReview: false,
      },
    });

    expect(result.contributingFactors.some(f => f.includes('Price Volume'))).toBe(true);
  });

  it('includes risks from missing adapter evidence', () => {
    const result = buildWhyDidThisMoveResult({
      ...baseInput,
      anomalyReview: {
        anomalyType: 'Stock-specific move',
        severity: 'High',
        evidence: ['Stock moved independently of sector.'],
        missingEvidence: [],
        narrativePromptPayload: {},
      },
      adapterEvidenceState: {
        available: ['prices'],
        partial: [],
        missing: ['fundamentals', 'technicals'],
        needsReview: true,
      },
    });

    expect(result.risksToThesis.some(r => r.includes('research inputs'))).toBe(true);
  });

  it('uses fallback values when needed context is empty', () => {
    const result = buildWhyDidThisMoveResult(baseInput);

    expect(result.neededContext.some(n => n.includes('adequate'))).toBe(true);
  });

  it('generates valid direction values for all anomaly types', () => {
    const anomalyTypes = [
      'Volume-backed price move',
      'Stock-specific move',
      'Market-aligned move',
      'Volatility expansion',
      'Gap move',
      'Delivery-supported move',
    ] as const;
    const validDirections: Set<MoveDirection> = new Set(['up', 'down', 'sideways', 'mixed']);

    for (const anomalyType of anomalyTypes) {
      const result = buildWhyDidThisMoveResult({
        ...baseInput,
        anomalyReview: {
          anomalyType,
          severity: 'Medium',
          evidence: ['Test evidence.'],
          missingEvidence: [],
          narrativePromptPayload: {},
        },
      });
      expect(validDirections.has(result.direction)).toBe(true);
    }
  });

  it('generates valid confidence values', () => {
    const severities: Array<{ severity: 'High' | 'Medium' | 'Low' | 'Needs review'; expected: MoveConfidence }> = [
      { severity: 'High', expected: 'strong' },
      { severity: 'Medium', expected: 'moderate' },
      { severity: 'Low', expected: 'weak' },
      { severity: 'Needs review', expected: 'weak' },
    ];

    for (const { severity, expected } of severities) {
      const result = buildWhyDidThisMoveResult({
        ...baseInput,
        anomalyReview: {
          anomalyType: 'Volume-backed price move',
          severity,
          evidence: ['Test evidence.'],
          missingEvidence: [],
          narrativePromptPayload: {},
        },
      });
      expect(result.confidence).toBe(expected);
    }
  });

  it('does not contain forbidden recommendation language', () => {
    const result = buildWhyDidThisMoveResult({
      ...baseInput,
      anomalyReview: {
        anomalyType: 'Volume-backed price move',
        severity: 'High',
        evidence: ['Price moved 5.2% on 3.8x volume.'],
        missingEvidence: [],
        narrativePromptPayload: {},
      },
    });

    const allText = [
      result.primaryDriver,
      result.summary,
      ...result.contributingFactors,
      ...result.risksToThesis,
      ...result.keyLevels,
      ...result.neededContext,
    ].join(' ').toLowerCase();

    const forbidden = ['strong buy', 'buy now', 'sell', 'hold', 'guaranteed', 'sure shot', 'multibagger'];
    for (const term of forbidden) {
      expect(allText).not.toContain(term);
    }
  });

  it('uses to-the-point analyst tone', () => {
    const result = buildWhyDidThisMoveResult({
      ...baseInput,
      anomalyReview: {
        anomalyType: 'Volume-backed price move',
        severity: 'High',
        evidence: ['Large block deal drove price.'],
        missingEvidence: [],
        narrativePromptPayload: {},
      },
    });

    expect(result.keyLevels.length).toBeGreaterThanOrEqual(1);
    expect(result.keyLevels[0].length).toBeLessThan(120);
    expect(result.summary.length).toBeLessThan(200);
  });
});
