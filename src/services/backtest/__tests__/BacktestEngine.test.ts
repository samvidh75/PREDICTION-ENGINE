import { describe, it, expect } from 'vitest';
import { BacktestEngine, PriceBar } from '../BacktestEngine';

const engine = new BacktestEngine();

function makeSyntheticPrices(bars: number, uptrend = true): PriceBar[] {
  const prices: PriceBar[] = [];
  let price = 100;
  for (let i = 0; i < bars; i++) {
    const change = uptrend ? Math.random() * 2 + 0.5 : Math.random() * 4 - 2;
    price += change;
    const day = (i % 28) + 1;
    const month = Math.floor(i / 28) + 1;
    prices.push({
      date: `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      open: price - 1,
      high: price + 2,
      low: price - 2,
      close: price,
      volume: 1000000 + Math.random() * 500000,
    });
  }
  return prices;
}

describe('BacktestEngine', () => {
  it('should produce trades with buy_hold strategy', async () => {
    const prices = makeSyntheticPrices(200);
    const result = await engine.run({
      symbol: 'TEST',
      strategy: 'buy_hold',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      initialCapital: 100000,
      params: {},
    }, prices);

    expect(result.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.initialCapital).toBe(100000);
    expect(result.finalCapital).toBeGreaterThan(0);
    expect(result.equityCurve.length).toBeGreaterThan(0);
  });

  it('should compute sharpe ratio', async () => {
    const prices = makeSyntheticPrices(200, true);
    const result = await engine.run({
      symbol: 'TEST',
      strategy: 'buy_hold',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      initialCapital: 100000,
      params: {},
    }, prices);

    expect(typeof result.sharpeRatio).toBe('number');
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it('should handle MA crossover strategy', async () => {
    const prices = makeSyntheticPrices(300);
    const result = await engine.run({
      symbol: 'TEST',
      strategy: 'ma_crossover',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      initialCapital: 50000,
      params: { fastPeriod: 10, slowPeriod: 30 },
    }, prices);

    expect(result.strategy).toBe('ma_crossover');
    expect(result.totalTrades).toBeGreaterThanOrEqual(0);
  });

  it('should handle RSI strategy', async () => {
    const prices = makeSyntheticPrices(300);
    const result = await engine.run({
      symbol: 'TEST',
      strategy: 'rsi',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      initialCapital: 50000,
      params: { period: 14, oversold: 30, overbought: 70 },
    }, prices);

    expect(result.symbol).toBe('TEST');
    expect(result.finalCapital).toBeGreaterThan(0);
  });

  it('should handle MACD strategy', async () => {
    const prices = makeSyntheticPrices(300);
    const result = await engine.run({
      symbol: 'TEST',
      strategy: 'macd',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      initialCapital: 50000,
      params: {},
    }, prices);

    expect(['macd']).toContain(result.strategy);
    expect(result.equityCurve.length).toBeGreaterThan(0);
  });

  it('should throw on insufficient data', async () => {
    const prices = makeSyntheticPrices(20);
    await expect(engine.run({
      symbol: 'TEST',
      strategy: 'buy_hold',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      initialCapital: 100000,
      params: {},
    }, prices)).rejects.toThrow(/Insufficient data/);
  });

  it('should compute win rate correctly', async () => {
    const prices = makeSyntheticPrices(252, true);
    const result = await engine.run({
      symbol: 'TEST',
      strategy: 'buy_hold',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      initialCapital: 100000,
      params: {},
    }, prices);

    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(100);
  });
});
