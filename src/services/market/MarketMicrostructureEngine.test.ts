import { describe, expect, it } from 'vitest';
import { MarketMicrostructureEngine } from './MarketMicrostructureEngine';
import type { Quote } from '../../backend/routes/liveQuoteProviders.js';

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    symbol: 'RELIANCE',
    price: 2500,
    bid: 2499.5,
    ask: 2500.5,
    volume: 120000,
    source: 'yahoo',
    timestamp: Date.parse('2026-07-03T09:15:00.000Z'),
    ...overrides,
  };
}

describe('MarketMicrostructureEngine', () => {
  it('builds a derived order book from the latest quote', () => {
    const engine = new MarketMicrostructureEngine();
    engine.recordQuote(quote());

    const orderBook = engine.buildOrderBook('reliance');

    expect(orderBook).not.toBeNull();
    expect(orderBook?.depthMode).toBe('derived_from_top_of_book');
    expect(orderBook?.bidLevels).toHaveLength(5);
    expect(orderBook?.askLevels).toHaveLength(5);
    expect(orderBook?.spreadBps).toBeGreaterThan(0);
    expect(orderBook?.bidLevels[0].price).toBeLessThan(orderBook?.askLevels[0].price ?? 0);
  });

  it('marks anomaly output unavailable without quote history', () => {
    const engine = new MarketMicrostructureEngine();

    expect(engine.buildAnomalySignal('TCS')).toEqual(
      expect.objectContaining({
        availability: 'unavailable',
        sampleSize: 0,
        flags: ['quote_history_unavailable'],
      }),
    );
  });

  it('flags abnormal volume and buy pressure when the latest observation deviates sharply', () => {
    const engine = new MarketMicrostructureEngine();
    const start = Date.parse('2026-07-03T09:15:00.000Z');

    for (let index = 0; index < 11; index++) {
      engine.recordQuote(
        quote({
          price: 2500 + index * 0.4,
          bid: 2499.6 + index * 0.35,
          ask: 2500.4 + index * 0.45,
          volume: 100000 + index * 500,
          timestamp: start + index * 1000,
        }),
        start + index * 1000,
      );
    }

    engine.recordQuote(
      quote({
        price: 2504.5,
        bid: 2503.9,
        ask: 2504.6,
        volume: 420000,
        timestamp: start + 12_000,
      }),
      start + 12_000,
    );

    const anomaly = engine.buildAnomalySignal('RELIANCE');

    expect(anomaly.availability).toBe('real');
    expect(anomaly.sampleSize).toBe(12);
    expect(anomaly.flags).toContain('abnormal_volume');
    expect(anomaly.flags).toContain('buy_pressure');
    expect(anomaly.anomalyScore).toBeGreaterThan(1);
  });
});
