import { describe, expect, it } from 'vitest';
import { mapQuote, mapCandle } from '../UpstoxMarketDataMapper';
import { mapHolding, mapPosition } from '../UpstoxPortfolioMapper';
import type { UpstoxQuote, UpstoxCandle, UpstoxHolding, UpstoxPosition } from '../UpstoxTypes';

describe('UpstoxMarketDataMapper', () => {
  it('mapQuote normalizes Upstox quote', () => {
    const quote: UpstoxQuote = {
      instrumentKey: 'NSE_EQ|INE002A01018',
      symbol: 'RELIANCE',
      lastPrice: 2850.50,
      change: 25.50,
      changePercent: 0.90,
      open: 2825.00,
      high: 2860.00,
      low: 2820.00,
      close: 2825.00,
      volume: 5000000,
      timestamp: '2026-06-23T10:30:00Z',
    };
    const result = mapQuote(quote);
    expect(result.symbol).toBe('RELIANCE');
    expect(result.lastPrice).toBe(2850.50);
    expect(result.exchange).toBe('NSE');
    expect(result.provider).toBe('upstox');
    expect(result.changePercent).toBe(0.90);
  });

  it('mapCandle normalizes Upstox candle', () => {
    const candle: UpstoxCandle = {
      timestamp: '2026-06-23T00:00:00Z',
      open: 2800,
      high: 2860,
      low: 2790,
      close: 2850,
      volume: 8000000,
      oi: 0,
    };
    const result = mapCandle(candle, 'RELIANCE');
    expect(result.symbol).toBe('RELIANCE');
    expect(result.date).toBe('2026-06-23');
    expect(result.open).toBe(2800);
    expect(result.high).toBe(2860);
    expect(result.low).toBe(2790);
    expect(result.close).toBe(2850);
    expect(result.volume).toBe(8000000);
    expect(result.provider).toBe('upstox');
  });
});

describe('UpstoxPortfolioMapper', () => {
  it('mapHolding normalizes Upstox holding', () => {
    const holding: UpstoxHolding = {
      instrumentKey: 'NSE_EQ|INE002A01018',
      symbol: 'RELIANCE',
      isin: 'INE002A01018',
      quantity: 10,
      averagePrice: 2800,
      lastPrice: 2850,
      pnl: 500,
      dayChange: 25,
      dayChangePercent: 0.88,
    };
    const result = mapHolding(holding);
    expect(result.symbol).toBe('RELIANCE');
    expect(result.quantity).toBe(10);
    expect(result.averagePrice).toBe(2800);
    expect(result.pnl).toBe(500);
    expect(result.provider).toBe('upstox');
  });

  it('mapPosition normalizes Upstox position', () => {
    const position: UpstoxPosition = {
      instrumentKey: 'NSE_EQ|INE002A01018',
      symbol: 'RELIANCE',
      isin: 'INE002A01018',
      quantity: 10,
      averagePrice: 2800,
      lastPrice: 2850,
      pnl: 500,
      buyQuantity: 10,
      sellQuantity: 0,
      buyAmount: 28000,
      sellAmount: 0,
    };
    const result = mapPosition(position);
    expect(result.symbol).toBe('RELIANCE');
    expect(result.quantity).toBe(10);
    expect(result.buyQuantity).toBe(10);
    expect(result.sellQuantity).toBe(0);
    expect(result.provider).toBe('upstox');
  });
});
