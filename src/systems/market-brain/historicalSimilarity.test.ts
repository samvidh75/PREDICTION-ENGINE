import { describe, expect, it } from 'vitest';
import { buildHistoricalSimilaritySummary } from './historicalSimilarity';
import type { HistoricalSimilarityCase, HistoricalSimilarityInput } from './historicalSimilarity';

const unsafePattern = /buy|sell|hold|strong buy|sure shot|guaranteed|multibagger|target|provider|api|backend|diagnostic|coverage|freshness|lineage|migration|backfill/i;

function makeCases(count: number): HistoricalSimilarityCase[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `case-${index + 1}`,
    symbol: 'TCS',
    timeframe: '15m',
    features: {
      priceMovePct: 2 + (index % 5) * 0.1,
      volumeMultiple: 1.8 + (index % 4) * 0.1,
      volatilityMultiple: 1.2 + (index % 3) * 0.1,
      sectorMovePct: 0.4,
      indexMovePct: 0.2,
      gapPct: 0,
    },
    outcome: {
      label: 'next_review_window',
      movePct: index % 2 === 0 ? 0.8 : -0.4,
      maxDrawdownPct: -0.7,
    },
  }));
}

const defaultInput: HistoricalSimilarityInput = {
  symbol: 'TCS',
  timeframe: '15m',
  current: {
    priceMovePct: 2.1,
    volumeMultiple: 1.9,
    volatilityMultiple: 1.3,
    sectorMovePct: 0.3,
    indexMovePct: 0.2,
    gapPct: 0,
  },
  cases: makeCases(40),
  minSampleSize: 30,
};

describe('historical similarity research foundation', () => {
  it('summarizes sufficiently large similar-case sets', () => {
    const summary = buildHistoricalSimilaritySummary(defaultInput);

    expect(summary.usable).toBe(true);
    expect(summary.needsReview).toBe(false);
    expect(summary.sampleSize).toBe(40);
    expect(summary.minSampleSize).toBe(30);
    expect(summary.medianMovePct).not.toBeNull();
    expect(summary.medianMaxDrawdownPct).toBe(-0.7);
    expect(summary.positiveCaseShare).toBeCloseTo(0.5);
    expect(summary.observations.join(' ')).toContain('research context');
    expect(summary.matchedCases.length).toBeGreaterThan(0);
    expect(summary.matchedCases[0]).toHaveProperty('similarityScore');
    expect(summary.matchedCases[0]).toHaveProperty('distance');
  });

  it('requires a minimum sample before exposing outcome statistics', () => {
    const summary = buildHistoricalSimilaritySummary({
      ...defaultInput,
      cases: makeCases(12),
      minSampleSize: 30,
    });

    expect(summary.usable).toBe(false);
    expect(summary.needsReview).toBe(true);
    expect(summary.sampleSize).toBe(12);
    expect(summary.medianMovePct).toBeNull();
    expect(summary.positiveCaseShare).toBeNull();
    expect(summary.limitations).toContain('Not enough similar historical cases for this view yet.');
  });

  it('filters cases by timeframe', () => {
    const summary = buildHistoricalSimilaritySummary({
      ...defaultInput,
      cases: [
        ...makeCases(30),
        ...makeCases(20).map((historicalCase) => ({ ...historicalCase, id: `daily-${historicalCase.id}`, timeframe: '1d' as const })),
      ],
      maxCases: 100,
    });

    expect(summary.sampleSize).toBe(30);
    expect(summary.matchedCaseIds.every((id) => id.startsWith('case-'))).toBe(true);
  });

  it('caps matched cases defensively', () => {
    const summary = buildHistoricalSimilaritySummary({
      ...defaultInput,
      cases: makeCases(250),
      maxCases: 50,
    });

    expect(summary.sampleSize).toBe(50);
    expect(summary.matchedCaseIds).toHaveLength(50);
  });

  it('handles malformed numeric features without crashing', () => {
    const summary = buildHistoricalSimilaritySummary({
      ...defaultInput,
      current: {
        priceMovePct: Number.NaN,
        volumeMultiple: Number.POSITIVE_INFINITY,
        volatilityMultiple: null,
      },
      cases: makeCases(40),
    });

    expect(summary.usable).toBe(false);
    expect(summary.sampleSize).toBe(0);
    expect(summary.limitations).toContain('Not enough similar historical cases for this view yet.');
  });

  it('marks malformed symbols for review without leaking internals', () => {
    const summary = buildHistoricalSimilaritySummary({
      ...defaultInput,
      symbol: '../../bad-symbol',
    });

    expect(summary.limitations).toContain('Symbol needs review before this view is used.');
    expect(summary.limitations.join(' ')).not.toMatch(unsafePattern);
  });

  it('returns fresh arrays', () => {
    const summary = buildHistoricalSimilaritySummary(defaultInput);
    const originalObservationCount = summary.observations.length;
    const originalMatchedCasesCount = summary.matchedCases.length;

    summary.observations.push('mutated');
    summary.limitations.push('mutated');
    summary.matchedCaseIds.push('mutated');
    summary.matchedCases.push({ id: 'mutated', symbol: 'X', timeframe: '15m', similarityScore: 0, distance: 0 });

    const nextSummary = buildHistoricalSimilaritySummary(defaultInput);
    expect(nextSummary.observations).toHaveLength(originalObservationCount);
    expect(nextSummary.observations).not.toContain('mutated');
    expect(nextSummary.limitations).not.toContain('mutated');
    expect(nextSummary.matchedCaseIds).not.toContain('mutated');
    expect(nextSummary.matchedCases).toHaveLength(originalMatchedCasesCount);
  });

  it('does not emit unsafe public copy', () => {
    const summary = buildHistoricalSimilaritySummary(defaultInput);
    const text = [
      ...summary.matchedCaseIds,
      ...summary.observations,
      ...summary.limitations,
      String(summary.medianMovePct),
      String(summary.positiveCaseShare),
    ].join(' ');

    expect(text).not.toMatch(unsafePattern);
  });

  it('sorts matchedCases by distance ascending and includes similarity scores', () => {
    const summary = buildHistoricalSimilaritySummary(defaultInput);

    for (let i = 1; i < summary.matchedCases.length; i++) {
      expect(summary.matchedCases[i].distance).toBeGreaterThanOrEqual(summary.matchedCases[i - 1].distance);
    }
    expect(summary.matchedCases[0].similarityScore).toBeGreaterThanOrEqual(0);
    expect(summary.matchedCases[0].similarityScore).toBeLessThanOrEqual(100);
  });

  it('produces matchedCases with correct shape', () => {
    const summary = buildHistoricalSimilaritySummary(defaultInput);

    expect(summary.matchedCases.length).toBeGreaterThan(0);
    for (const match of summary.matchedCases) {
      expect(match).toHaveProperty('id');
      expect(match).toHaveProperty('symbol');
      expect(match).toHaveProperty('timeframe');
      expect(match).toHaveProperty('similarityScore');
      expect(match).toHaveProperty('distance');
      expect(match.symbol).toMatch(/^[A-Z0-9._-]{1,24}$/);
      expect(match.similarityScore).toBeGreaterThanOrEqual(0);
      expect(match.similarityScore).toBeLessThanOrEqual(100);
      expect(match.distance).toBeGreaterThanOrEqual(0);
    }
  });

  it('sets needsReview when not usable but has some matched cases', () => {
    const summary = buildHistoricalSimilaritySummary({
      ...defaultInput,
      cases: makeCases(15),
      minSampleSize: 30,
    });

    expect(summary.usable).toBe(false);
    expect(summary.needsReview).toBe(true);
    expect(summary.sampleSize).toBe(15);
  });

  it('sets needsReview false when usable', () => {
    const summary = buildHistoricalSimilaritySummary(defaultInput);

    expect(summary.usable).toBe(true);
    expect(summary.needsReview).toBe(false);
  });

  it('handles null outcome gracefully', () => {
    const casesWithNullOutcomes = makeCases(35).map((c) => ({ ...c, outcome: null }));
    const summary = buildHistoricalSimilaritySummary({
      ...defaultInput,
      cases: casesWithNullOutcomes,
    });

    expect(summary.usable).toBe(true);
    expect(summary.medianMovePct).toBeNull();
    expect(summary.positiveCaseShare).toBeNull();
    expect(summary.limitations).toContain('Some similar cases do not include outcome observations.');
  });

  it('handles re-entrant malformed current with no valid features', () => {
    const summary = buildHistoricalSimilaritySummary({
      ...defaultInput,
      current: {
        priceMovePct: Number.NaN,
        volumeMultiple: Number.POSITIVE_INFINITY,
        volatilityMultiple: null,
        sectorMovePct: undefined,
        indexMovePct: Number.NEGATIVE_INFINITY,
      },
      cases: makeCases(50),
    });

    expect(summary.usable).toBe(false);
    expect(summary.sampleSize).toBe(0);
    expect(summary.limitations).toContain('Not enough similar historical cases for this view yet.');
  });

  it('removes unmatched timeframe cases from matchedCases', () => {
    const mixedCases = [
      ...makeCases(30),
      ...makeCases(20).map((c) => ({ ...c, id: `1d-${c.id}`, timeframe: '1d' as const })),
    ];
    const summary = buildHistoricalSimilaritySummary({
      ...defaultInput,
      cases: mixedCases,
      maxCases: 100,
    });

    expect(summary.matchedCases.every((m) => m.timeframe === '15m')).toBe(true);
    expect(summary.matchedCaseIds.every((id) => id.startsWith('case-'))).toBe(true);
  });
});
