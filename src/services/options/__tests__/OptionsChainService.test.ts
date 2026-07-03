import { describe, it, expect } from 'vitest';
import { OptionsChainService } from '../OptionsChainService';

const service = new OptionsChainService();

describe('OptionsChainService', () => {
  const futureExpiry = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  it('should generate chain with calls and puts', () => {
    const chain = service.generateChain('NIFTY', 19500, futureExpiry());
    expect(chain.calls.length).toBeGreaterThan(0);
    expect(chain.puts.length).toBeGreaterThan(0);
    expect(chain.calls.length).toBe(chain.puts.length);
  });

  it('should compute PCR ratio', () => {
    const chain = service.generateChain('BANKNIFTY', 44000, futureExpiry());
    expect(chain.pcRatio).toBeGreaterThan(0);
    expect(chain.totalCallOI).toBeGreaterThan(0);
    expect(chain.totalPutOI).toBeGreaterThan(0);
  });

  it('should compute Greeks via Black-Scholes', () => {
    const greeks = service.computeGreeks({
      spot: 19500,
      strike: 19500,
      timeToExpiry: 30 / 365,
      volatility: 0.2,
      riskFreeRate: 0.065,
    });
    expect(greeks.delta).toBeGreaterThan(0);
    expect(greeks.gamma).toBeGreaterThan(0);
    expect(greeks.theta).toBeLessThan(0);
    expect(greeks.vega).toBeGreaterThan(0);
    expect(typeof greeks.rho).toBe('number');
  });

  it('should return max pain near ATM strike', () => {
    const chain = service.generateChain('RELIANCE', 2500, futureExpiry());
    expect(chain.maxPain).toBeGreaterThan(0);
    expect(Math.abs(chain.maxPain - 2500)).toBeLessThanOrEqual(550);
  });

  it('should analyze PCR signal', () => {
    const chain = service.generateChain('TCS', 3500, futureExpiry());
    const analysis = service.analyzePCRatio(chain);
    expect(['bullish', 'bearish', 'neutral']).toContain(analysis.signal);
    expect(typeof analysis.description).toBe('string');
  });

  it('should return ATM delta near 0.5 for call', () => {
    const greeks = service.computeGreeks({
      spot: 100,
      strike: 100,
      timeToExpiry: 0.5,
      volatility: 0.25,
      riskFreeRate: 0.065,
    });
    expect(greeks.delta).toBeCloseTo(0.5, 0);
  });

  it('should handle zero time to expiry', () => {
    const greeks = service.computeGreeks({
      spot: 100,
      strike: 100,
      timeToExpiry: 0,
      volatility: 0.25,
      riskFreeRate: 0.065,
    });
    expect(greeks.delta).toBe(1);
    expect(greeks.gamma).toBe(0);
  });
});
