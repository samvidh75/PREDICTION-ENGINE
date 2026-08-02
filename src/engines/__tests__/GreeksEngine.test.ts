import { describe, expect, it } from 'vitest';
import { GreeksEngine } from '../GreeksEngine.js';

describe('GreeksEngine', () => {
  it('computes option Greeks for a call', () => {
    const engine = new GreeksEngine();
    const greeks = engine.computeOptionsGreeks({
      symbol: 'RELIANCE',
      spotPrice: 2500,
      strike: 2600,
      timeToExpiry: 30 / 365,
      volatility: 0.25,
      optionType: 'call',
      riskFreeRate: 0.065,
      quantity: 1,
      positionType: 'long',
    });
    expect(greeks.delta).toBeGreaterThan(0);
    expect(greeks.delta).toBeLessThan(1);
    expect(greeks.gamma).toBeGreaterThan(0);
    expect(greeks.theta).toBeLessThan(0);
    expect(greeks.vega).toBeGreaterThan(0);
    expect(greeks.rho).toBeGreaterThan(0);
  });

  it('computes option Greeks for a put', () => {
    const engine = new GreeksEngine();
    const greeks = engine.computeOptionsGreeks({
      symbol: 'RELIANCE',
      spotPrice: 2500,
      strike: 2400,
      timeToExpiry: 30 / 365,
      volatility: 0.25,
      optionType: 'put',
      riskFreeRate: 0.065,
      quantity: 1,
      positionType: 'long',
    });
    expect(greeks.delta).toBeLessThan(0);
    expect(greeks.delta).toBeGreaterThan(-1);
    expect(greeks.gamma).toBeGreaterThan(0);
  });

  it('computes portfolio Greeks', () => {
    const engine = new GreeksEngine();
    const result = engine.computePortfolioGreeks([
      { symbol: 'A', spotPrice: 100, strike: 110, timeToExpiry: 30 / 365, volatility: 0.2, optionType: 'call', riskFreeRate: 0.065, quantity: 10, positionType: 'long' },
      { symbol: 'B', spotPrice: 200, strike: 190, timeToExpiry: 60 / 365, volatility: 0.3, optionType: 'put', riskFreeRate: 0.065, quantity: 5, positionType: 'short' },
    ]);
    expect(typeof result.netDelta).toBe('number');
    expect(typeof result.netGamma).toBe('number');
    expect(typeof result.netTheta).toBe('number');
    expect(typeof result.netVega).toBe('number');
    expect(typeof result.netRho).toBe('number');
  });

  it('identifies directional bias', () => {
    const engine = new GreeksEngine();
    const result = engine.computeRiskDecomposition([
      { symbol: 'A', spotPrice: 100, strike: 90, timeToExpiry: 30 / 365, volatility: 0.2, optionType: 'call', riskFreeRate: 0.065, quantity: 100, positionType: 'long' },
    ]);
    expect(result.directionalBias).toBe('bullish');
    expect(result.largestDelta).not.toBeNull();
    expect(result.largestGamma).not.toBeNull();
  });
});
