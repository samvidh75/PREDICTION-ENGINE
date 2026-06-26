import { describe, expect, it } from 'vitest';
import { evaluateMarketBrainInput, toIndiaEquityPacket } from './engineInputAdapter';

describe('market brain engine input adapter', () => {
  it('maps normalized engine input into an India equity packet', () => {
    const packet = toIndiaEquityPacket(
      {
        symbol: 'INFY',
        tradeDate: '2026-06-27',
        sector: { name: 'Information Technology' },
        financials: {
          peRatio: 24,
          roe: 28,
          roic: 29,
          revenueGrowth: 12,
          profitGrowth: 13,
          operatingMargin: 25,
        },
        features: {
          rsi: 58,
          momentum: 11,
          volatility: 19,
        },
      },
      { name: 'Infosys Limited' },
    );

    expect(packet.symbol).toBe('INFY');
    expect(packet.companyName).toBe('Infosys Limited');
    expect(packet.sector).toBe('Information Technology');
    expect(packet.evidence?.fundamentals).toBe('ready');
    expect(packet.evidence?.financial_statements).toBe('ready');
    expect(packet.evidence?.technicals).toBe('ready');
  });

  it('evaluates mapped input without provider-specific fields', () => {
    const result = evaluateMarketBrainInput(
      {
        symbol: 'INFY',
        tradeDate: '2026-06-27',
        sector: { name: 'Information Technology' },
        financials: {
          peRatio: 24,
          pbRatio: 5,
          evEbitda: 18,
          roe: 28,
          roa: 17,
          roic: 29,
          revenueGrowth: 12,
          profitGrowth: 15,
          operatingMargin: 25,
          debtToEquity: 0.1,
          currentRatio: 2,
          fcfYield: 5,
          marketCap: 6000000000000,
        },
        features: {
          rsi: 58,
          momentum: 12,
          relativeStrength: 10,
          volatility: 18,
          trendStrength: 11,
        },
      },
      { companyName: 'Infosys Limited', sector: 'Information Technology' },
    );

    expect(result.symbol).toBe('INFY');
    expect(result.companyName).toBe('Infosys Limited');
    expect(result.convictionScore).toBeGreaterThan(65);
    expect(result.complianceNote).toContain('Research-only');
  });
});
