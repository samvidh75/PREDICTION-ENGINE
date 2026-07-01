import { describe, it, expect } from 'vitest';
import { adaptLensoryInputs } from './LensoryInputAdapter';
import type { EngineInputs } from '../../stockstory/types';

function makeEngineInputs(overrides: Partial<EngineInputs> = {}): EngineInputs {
  return {
    symbol: 'AAPL',
    tradeDate: '2025-06-01',
    features: {
      rsi: 55,
      macd: 1.2,
      macdSignal: 0.8,
      macdHistogram: 0.4,
      adx: 25,
      atr: 1.5,
      bollingerWidth: 3.2,
      momentum: 0.5,
      volatility: 22,
      relativeStrength: -0.3,
      movingAverageDistance: 1.1,
      trendStrength: 0.7,
    },
    factors: {
      qualityFactor: 75,
      valueFactor: 45,
      growthFactor: 68,
      momentumFactor: 55,
      riskFactor: 30,
      sectorStrengthFactor: 60,
      factorScore: 58,
    },
    financials: {
      peRatio: 28.5,
      pbRatio: 6.2,
      eps: 6.12,
      dividendYield: 0.5,
      beta: 1.2,
      marketCap: 2_800_000_000_000,
      freeFloat: 0.95,
      fcfYield: 0.03,
      evEbitda: 22.5,
      roa: 18.3,
      roe: 45.2,
      roic: 32.1,
      debtToEquity: 1.5,
      currentRatio: 1.1,
      revenueGrowth: 8.5,
      profitGrowth: 10.2,
      epsGrowth: 12.1,
      fcfGrowth: 7.3,
      grossMargin: 43.5,
      operatingMargin: 30.2,
    },
    historical: {
      priceHistory: [
        { tradeDate: '2025-05-25', close: 190 },
        { tradeDate: '2025-05-26', close: 192 },
        { tradeDate: '2025-05-27', close: 191 },
        { tradeDate: '2025-05-28', close: 193 },
        { tradeDate: '2025-05-29', close: 195 },
        { tradeDate: '2025-05-30', close: 194 },
        { tradeDate: '2025-05-31', close: 196 },
      ],
    },
    sector: {
      name: 'Technology',
      sectorStrength: 60,
      sectorMomentum: 'Steady',
    },
    ...overrides,
  };
}

describe('adaptLensoryInputs', () => {
  it('converts EngineInputs with valid data into UnifiedPredictionInput', () => {
    const inputs = makeEngineInputs();
    const result = adaptLensoryInputs('AAPL', 30, inputs);

    expect(result.symbol).toBe('AAPL');
    expect(result.horizon).toBe(30);
    expect(result.tradeDate).toBe('2025-06-01');
    expect(result.sector).toBe('Technology');

    expect(result.close).toBe(196);
    expect(result.closePrices).toEqual([190, 192, 191, 193, 195, 194, 196]);
    expect(result.tradeDates).toEqual([
      '2025-05-25', '2025-05-26', '2025-05-27',
      '2025-05-28', '2025-05-29', '2025-05-30', '2025-05-31',
    ]);

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

    expect(result.peRatio).toBe(28.5);
    expect(result.pbRatio).toBe(6.2);
    expect(result.eps).toBe(6.12);
    expect(result.dividendYield).toBe(0.5);
    expect(result.beta).toBe(1.2);
    expect(result.marketCap).toBe(2_800_000_000_000);
    expect(result.freeFloat).toBe(0.95);
    expect(result.fcfYield).toBe(0.03);
    expect(result.evEbitda).toBe(22.5);
    expect(result.roa).toBe(18.3);
    expect(result.roe).toBe(45.2);
    expect(result.roic).toBe(32.1);
    expect(result.debtToEquity).toBe(1.5);
    expect(result.currentRatio).toBe(1.1);
    expect(result.revenueGrowth).toBe(8.5);
    expect(result.profitGrowth).toBe(10.2);
    expect(result.epsGrowth).toBe(12.1);
    expect(result.fcfGrowth).toBe(7.3);
    expect(result.grossMargin).toBe(43.5);
    expect(result.operatingMargin).toBe(30.2);
  });

  it('null financials produce null in corresponding input fields', () => {
    const inputs = makeEngineInputs({
      financials: {
        peRatio: null,
        pbRatio: null,
        eps: null,
        dividendYield: null,
        beta: null,
        marketCap: null,
        freeFloat: null,
        fcfYield: null,
        evEbitda: null,
        roa: null,
        roe: null,
        roic: null,
        debtToEquity: null,
        currentRatio: null,
        revenueGrowth: null,
        profitGrowth: null,
        epsGrowth: null,
        fcfGrowth: null,
        grossMargin: null,
        operatingMargin: null,
      },
    });
    const result = adaptLensoryInputs('AAPL', 30, inputs);

    expect(result.peRatio).toBeNull();
    expect(result.pbRatio).toBeNull();
    expect(result.eps).toBeNull();
    expect(result.dividendYield).toBeNull();
    expect(result.beta).toBeNull();
    expect(result.marketCap).toBeNull();
    expect(result.freeFloat).toBeNull();
    expect(result.fcfYield).toBeNull();
    expect(result.evEbitda).toBeNull();
    expect(result.roa).toBeNull();
    expect(result.roe).toBeNull();
    expect(result.roic).toBeNull();
    expect(result.debtToEquity).toBeNull();
    expect(result.currentRatio).toBeNull();
    expect(result.revenueGrowth).toBeNull();
    expect(result.profitGrowth).toBeNull();
    expect(result.epsGrowth).toBeNull();
    expect(result.fcfGrowth).toBeNull();
    expect(result.grossMargin).toBeNull();
    expect(result.operatingMargin).toBeNull();
  });

  it('finite number guard catches NaN/Infinity', () => {
    const inputs = makeEngineInputs({
      financials: {
        peRatio: NaN,
        pbRatio: Infinity,
        eps: -Infinity,
        dividendYield: null,
        beta: null,
        marketCap: null,
        freeFloat: null,
        fcfYield: null,
        evEbitda: null,
        roa: null,
        roe: null,
        roic: null,
        debtToEquity: null,
        currentRatio: null,
        revenueGrowth: null,
        profitGrowth: null,
        epsGrowth: null,
        fcfGrowth: null,
        grossMargin: null,
        operatingMargin: null,
      },
    });
    const result = adaptLensoryInputs('AAPL', 30, inputs);

    expect(result.peRatio).toBeNull();
    expect(result.pbRatio).toBeNull();
    expect(result.eps).toBeNull();
  });

  it('horizon mapping works for all 5 values', () => {
    const base = makeEngineInputs();
    expect(adaptLensoryInputs('A', 7, base).horizon).toBe(7);
    expect(adaptLensoryInputs('A', 30, base).horizon).toBe(30);
    expect(adaptLensoryInputs('A', 90, base).horizon).toBe(90);
    expect(adaptLensoryInputs('A', 180, base).horizon).toBe(180);
    expect(adaptLensoryInputs('A', 365, base).horizon).toBe(365);
  });

  it('horizon maps nearest valid value', () => {
    const base = makeEngineInputs();
    expect(adaptLensoryInputs('A', 14, base).horizon).toBe(7);
    expect(adaptLensoryInputs('A', 20, base).horizon).toBe(30);
    expect(adaptLensoryInputs('A', 75, base).horizon).toBe(90);
    expect(adaptLensoryInputs('A', 135, base).horizon).toBe(90);
    expect(adaptLensoryInputs('A', 320, base).horizon).toBe(365);
  });

  it('default values for missing optional fields', () => {
    const inputs = makeEngineInputs({
      historical: undefined,
      sector: undefined,
    });
    const result = adaptLensoryInputs('AAPL', 30, inputs);

    expect(result.close).toBeNull();
    expect(result.closePrices).toEqual([]);
    expect(result.tradeDates).toEqual([]);
    expect(result.sector).toBeNull();
    expect(result.open).toBeNull();
    expect(result.high).toBeNull();
    expect(result.low).toBeNull();
    expect(result.volume).toBeNull();
    expect(result.netMargin).toBeNull();
    expect(result.revenue).toBeNull();
    expect(result.operatingProfit).toBeNull();
    expect(result.netProfit).toBeNull();
    expect(result.totalAssets).toBeNull();
    expect(result.totalDebt).toBeNull();
    expect(result.equity).toBeNull();
    expect(result.cashFlowFromOperations).toBeNull();
  });
});
