import { describe, it, expect } from 'vitest';
import { adaptDatabaseSnapshot } from './DatabaseSnapshotAdapter';

describe('adaptDatabaseSnapshot', () => {
  it('converts DB snapshot data into input with correct field mapping', () => {
    const result = adaptDatabaseSnapshot(
      'AAPL',
      '2025-06-01',
      30,
      {
        pe_ratio: 28.5,
        pb_ratio: 6.2,
        eps: 6.12,
        roe: 45.2,
        roa: 18.3,
        debt_to_equity: 1.5,
        revenue_growth: 8.5,
        profit_growth: 10.2,
        operating_margin: 30.2,
        dividend_yield: 0.5,
        beta: 1.2,
        market_cap: 2_800_000_000_000,
        free_float: 0.95,
        fcf_yield: 0.03,
        ev_ebitda: 22.5,
        roic: 32.1,
        current_ratio: 1.1,
        eps_growth: 12.1,
        fcf_growth: 7.3,
        gross_margin: 43.5,
        net_margin: 25.1,
        revenue: 390_000_000_000,
        operating_profit: 120_000_000_000,
        net_profit: 95_000_000_000,
        total_assets: 350_000_000_000,
        total_debt: 110_000_000_000,
        equity: 70_000_000_000,
        cash_flow_from_operations: 105_000_000_000,
        period_end: '2025-03-31',
      },
      [
        { trade_date: '2025-05-25', close: 190, open: 189, high: 192, low: 188, volume: 50_000_000 },
        { trade_date: '2025-05-26', close: 192, open: 191, high: 193, low: 190, volume: 45_000_000 },
        { trade_date: '2025-05-27', close: 191, open: 192, high: 194, low: 190, volume: 52_000_000 },
        { trade_date: '2025-05-28', close: 193, open: 192, high: 195, low: 191, volume: 48_000_000 },
        { trade_date: '2025-05-29', close: 195, open: 194, high: 196, low: 193, volume: 55_000_000 },
        { trade_date: '2025-05-30', close: 194, open: 195, high: 196, low: 193, volume: 47_000_000 },
        { trade_date: '2025-05-31', close: 196, open: 195, high: 197, low: 194, volume: 53_000_000 },
      ],
      {
        rsi: 55,
        macd: 1.2,
        macd_signal: 0.8,
        macd_histogram: 0.4,
        adx: 25,
        atr: 1.5,
        bollinger_width: 3.2,
        relative_strength: -0.3,
        moving_average_distance: 1.1,
        trend_strength: 0.7,
      },
      {
        quality_factor: 75,
        value_factor: 45,
        growth_factor: 68,
        momentum_factor: 55,
        risk_factor: 30,
        sector_strength_factor: 60,
      },
      'Technology',
    );

    expect(result.symbol).toBe('AAPL');
    expect(result.tradeDate).toBe('2025-06-01');
    expect(result.horizon).toBe(30);
    expect(result.sector).toBe('Technology');

    expect(result.close).toBe(196);
    expect(result.open).toBe(195);
    expect(result.high).toBe(197);
    expect(result.low).toBe(194);
    expect(result.volume).toBe(53_000_000);
    expect(result.closePrices).toHaveLength(7);
    expect(result.tradeDates).toHaveLength(7);

    expect(result.peRatio).toBe(28.5);
    expect(result.pbRatio).toBe(6.2);
    expect(result.eps).toBe(6.12);
    expect(result.roe).toBe(45.2);
    expect(result.roa).toBe(18.3);
    expect(result.debtToEquity).toBe(1.5);
    expect(result.revenueGrowth).toBe(8.5);
    expect(result.profitGrowth).toBe(10.2);
    expect(result.operatingMargin).toBe(30.2);
    expect(result.dividendYield).toBe(0.5);
    expect(result.beta).toBe(1.2);
    expect(result.marketCap).toBe(2_800_000_000_000);
    expect(result.freeFloat).toBe(0.95);
    expect(result.fcfYield).toBe(0.03);
    expect(result.evEbitda).toBe(22.5);
    expect(result.roic).toBe(32.1);
    expect(result.currentRatio).toBe(1.1);
    expect(result.epsGrowth).toBe(12.1);
    expect(result.fcfGrowth).toBe(7.3);
    expect(result.grossMargin).toBe(43.5);
    expect(result.netMargin).toBe(25.1);
    expect(result.revenue).toBe(390_000_000_000);
    expect(result.operatingProfit).toBe(120_000_000_000);
    expect(result.netProfit).toBe(95_000_000_000);
    expect(result.totalAssets).toBe(350_000_000_000);
    expect(result.totalDebt).toBe(110_000_000_000);
    expect(result.equity).toBe(70_000_000_000);
    expect(result.cashFlowFromOperations).toBe(105_000_000_000);

    expect(result.rsi).toBe(55);
    expect(result.macd).toBe(1.2);
    expect(result.macdSignal).toBe(0.8);
    expect(result.macdHistogram).toBe(0.4);
    expect(result.adx).toBe(25);
    expect(result.atr).toBe(1.5);
    expect(result.bollingerWidth).toBe(3.2);
    expect(result.relativeStrength).toBe(-0.3);
    expect(result.movingAverageDistance).toBe(1.1);
    expect(result.trendStrength).toBe(0.7);

    expect(result.qualityFactor).toBe(75);
    expect(result.valueFactor).toBe(45);
    expect(result.growthFactor).toBe(68);
    expect(result.momentumFactor).toBe(55);
    expect(result.riskFactor).toBe(30);
    expect(result.sectorStrengthFactor).toBe(60);
  });

  it('snake_case to camelCase mapping works with camelCase input keys', () => {
    const result = adaptDatabaseSnapshot(
      'AAPL',
      '2025-06-01',
      30,
      {
        peRatio: 28.5,
        pbRatio: 6.2,
        roe: 45.2,
      },
      [],
      undefined,
      undefined,
      'Technology',
    );

    expect(result.peRatio).toBe(28.5);
    expect(result.pbRatio).toBe(6.2);
    expect(result.roe).toBe(45.2);
  });

  it('empty arrays handled gracefully', () => {
    const result = adaptDatabaseSnapshot(
      'AAPL',
      '2025-06-01',
      30,
      {},
      [],
      undefined,
      undefined,
      null,
    );

    expect(result.closePrices).toEqual([]);
    expect(result.tradeDates).toEqual([]);
    expect(result.close).toBeNull();
    expect(result.open).toBeNull();
    expect(result.high).toBeNull();
    expect(result.low).toBeNull();
    expect(result.volume).toBeNull();
    expect(result.sector).toBeNull();
    expect(result.peRatio).toBeNull();
    expect(result.rsi).toBeNull();
    expect(result.qualityFactor).toBeNull();
  });

  it('sector defaults to null when not provided', () => {
    const result = adaptDatabaseSnapshot('AAPL', '2025-06-01', 90, {}, [], undefined, undefined, null);
    expect(result.sector).toBeNull();
  });

  it('horizon mapping works', () => {
    const r7 = adaptDatabaseSnapshot('A', '2025-06-01', 7, {}, []);
    expect(r7.horizon).toBe(7);

    const r365 = adaptDatabaseSnapshot('A', '2025-06-01', 365, {}, []);
    expect(r365.horizon).toBe(365);

    const rNearest = adaptDatabaseSnapshot('A', '2025-06-01', 14, {}, []);
    expect(rNearest.horizon).toBe(7);
  });
});
