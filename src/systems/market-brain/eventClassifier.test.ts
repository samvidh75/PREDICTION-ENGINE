// src/systems/market-brain/eventClassifier.test.ts

import { describe, expect, it } from 'vitest';
import { classifyMarketEvent } from './eventClassifier';

const unsafePattern = /buy|sell|hold|strong buy|sure shot|guaranteed|multibagger|provider|api|backend|diagnostic|coverage|freshness|lineage|migration|backfill/i;

describe('classifyMarketEvent', () => {
  it('classifies a price move', () => {
    const result = classifyMarketEvent({ symbol: 'TCS', timeframe: '15m', priceMovePct: 1.2 });

    expect(result.primaryEvent).toBe('price_move');
    expect(result.severity).toBe('low');
    expect(result.reasons).toContain('Price moved +1.2%.');
  });

  it('classifies a volume spike', () => {
    const result = classifyMarketEvent({ symbol: 'TCS', timeframe: '15m', priceMovePct: 1.8, volumeMultiple: 2 });

    expect(result.primaryEvent).toBe('volume_spike');
    expect(result.severity).toBe('medium');
    expect(result.reasons).toContain('Volume was 2x recent levels.');
  });

  it('classifies volatility expansion', () => {
    const result = classifyMarketEvent({ symbol: 'SBIN', timeframe: '1h', volatilityMultiple: 2.7 });

    expect(result.primaryEvent).toBe('volatility_expansion');
    expect(result.severity).toBe('high');
  });

  it('classifies sector divergence', () => {
    const result = classifyMarketEvent({
      symbol: 'INFY',
      timeframe: '1h',
      priceMovePct: 3,
      sectorMovePct: 0.5,
      indexMovePct: 0.2,
    });

    expect(result.primaryEvent).toBe('sector_divergence');
    expect(result.severity).toBe('high');
  });

  it('classifies market-aligned move', () => {
    const result = classifyMarketEvent({
      symbol: 'HDFCBANK',
      timeframe: '1d',
      priceMovePct: 0.8,
      sectorMovePct: 0.6,
      indexMovePct: 0.7,
    });

    expect(result.primaryEvent).toBe('market_aligned_move');
    expect(result.severity).toBe('low');
  });

  it('classifies gap move', () => {
    const result = classifyMarketEvent({ symbol: 'RELIANCE', timeframe: '1d', gapPct: -1.4 });

    expect(result.primaryEvent).toBe('gap_move');
    expect(result.severity).toBe('low');
  });

  it('handles incomplete input', () => {
    const result = classifyMarketEvent({ symbol: 'TCS', timeframe: '15m' });

    expect(result.primaryEvent).toBe('incomplete');
    expect(result.severity).toBe('needs_review');
  });

  it('ignores malformed numeric inputs', () => {
    const result = classifyMarketEvent({
      symbol: 'TCS',
      timeframe: '15m',
      priceMovePct: Number.NaN,
      volumeMultiple: Infinity,
      volatilityMultiple: -1,
    });

    expect(result.primaryEvent).toBe('incomplete');
    expect(result.severity).toBe('needs_review');
  });

  it('returns fresh reason arrays', () => {
    const first = classifyMarketEvent({ symbol: 'TCS', timeframe: '15m', priceMovePct: 1 });
    const second = classifyMarketEvent({ symbol: 'TCS', timeframe: '15m', priceMovePct: 1 });

    expect(first.reasons).not.toBe(second.reasons);
    first.reasons.push('mutated');
    expect(second.reasons).not.toContain('mutated');
  });

  it('does not emit unsafe public copy', () => {
    const result = classifyMarketEvent({ symbol: 'TCS', timeframe: '15m', priceMovePct: 2, volumeMultiple: 2 });

    expect([result.primaryEvent, result.severity, ...result.reasons].join(' ')).not.toMatch(unsafePattern);
  });
});
