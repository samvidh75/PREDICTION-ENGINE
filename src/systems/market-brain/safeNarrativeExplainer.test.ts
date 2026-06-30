// src/systems/market-brain/safeNarrativeExplainer.test.ts
// Phase 10 — safe narrative explainer abstraction tests.

import { describe, expect, it } from 'vitest';
import { buildSafeNarrativeExplanation } from './safeNarrativeExplainer';

const collectText = (result: ReturnType<typeof buildSafeNarrativeExplanation>): string => [
  result.headline,
  ...result.explanation,
  ...result.evidenceToReview,
  ...result.risksToReview,
  ...result.whatToWatch,
].join(' ');

describe('buildSafeNarrativeExplanation', () => {
  it('builds deterministic explanation from compressed evidence payload', () => {
    const result = buildSafeNarrativeExplanation({
      symbol: 'TCS',
      payload: 'Volume expanded versus recent sessions. Sector movement was mixed. Risk needs review.',
    });

    expect(result.symbol).toBe('TCS');
    expect(result.mode).toBe('deterministic_fallback');
    expect(result.needsReview).toBe(false);
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.headline).toContain('TCS');
  });

  it('returns review state for empty payload', () => {
    const result = buildSafeNarrativeExplanation({
      symbol: 'INFY',
      payload: '',
    });

    expect(result.needsReview).toBe(true);
    expect(result.explanation[0]).toContain('not enough clean evidence');
    expect(result.evidenceToReview[0]).toContain('Additional research evidence');
  });

  it('bounds payload and marks review when payload is too long', () => {
    const result = buildSafeNarrativeExplanation({
      symbol: 'RELIANCE',
      payload: 'Volume expanded. '.repeat(200),
      maxBullets: 10,
    });

    expect(result.needsReview).toBe(true);
    expect(result.explanation.length).toBeLessThanOrEqual(6);
  });

  it('drops unsafe direct recommendation and plumbing language', () => {
    const result = buildSafeNarrativeExplanation({
      symbol: 'SBIN',
      payload: [
        'Buy now because target price is guaranteed.',
        'Provider API backend diagnostics reported coverage issues.',
        'Volume expanded in the latest move.',
      ].join('\n'),
    });

    const allText = collectText(result).toLowerCase();
    expect(allText).toContain('volume expanded');
    for (const term of [
      'buy now',
      'target price',
      'guaranteed',
      'provider',
      'api',
      'backend',
      'diagnostics',
      'coverage',
    ]) {
      expect(allText).not.toContain(term);
    }
  });

  it('normalizes malformed symbols safely', () => {
    const result = buildSafeNarrativeExplanation({
      symbol: '../../bad symbol',
      payload: 'Price action was unusual and needs review.',
    });

    expect(result.symbol).toBe('BADSYMBOL');
    expect(result.headline).toContain('BADSYMBOL');
  });

  it('dedupes repeated evidence lines', () => {
    const result = buildSafeNarrativeExplanation({
      symbol: 'HDFCBANK',
      payload: 'Volume expanded. Volume expanded. Volume expanded.',
    });

    expect(result.evidenceToReview).toEqual(['Volume expanded']);
  });

  it('returns fresh output arrays', () => {
    const result = buildSafeNarrativeExplanation({
      symbol: 'ITC',
      payload: 'Move was supported by available market evidence.',
    });

    const explanation = result.explanation;
    const evidenceToReview = result.evidenceToReview;
    explanation.push('Mutated line');
    evidenceToReview.push('Mutated evidence');

    const next = buildSafeNarrativeExplanation({
      symbol: 'ITC',
      payload: 'Move was supported by available market evidence.',
    });

    expect(next.explanation).not.toContain('Mutated line');
    expect(next.evidenceToReview).not.toContain('Mutated evidence');
  });

  it('does not expose forbidden copy', () => {
    const result = buildSafeNarrativeExplanation({
      symbol: 'LT',
      payload: 'Evidence indicates unusual volume and mixed market context.',
    });

    const allText = collectText(result).toLowerCase();
    const forbidden = [
      'strong buy',
      'buy now',
      'sell now',
      'hold recommendation',
      'guaranteed',
      'sure shot',
      'multibagger',
      'target price',
      'provider',
      'backend',
      'diagnostics',
      'coverage',
      'freshness',
      'lineage',
      'migration',
      'backfill',
      'source pending',
      'source verified',
      'quote unavailable',
      'history unavailable',
      'rag',
      'vector',
      'embedding',
      'chunk',
      'adapter_unavailable',
      'empty_response',
      'malformed_response',
    ];

    for (const term of forbidden) {
      expect(allText).not.toContain(term);
    }
  });
});
