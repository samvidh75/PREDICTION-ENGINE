import { describe, expect, it } from 'vitest';
import { buildCompanyTelemetry } from './MarketDataOrchestrator';

describe('buildCompanyTelemetry', () => {
  it('keeps unsupported telemetry fields unavailable instead of fabricating placeholders', () => {
    const telemetry = buildCompanyTelemetry(
      {
        symbol: 'RELIANCE',
        exchange: 'NSE',
        price: 1400,
        change: 10,
        changePercent: 0.72,
        updatedAt: '2026-06-13T09:30:00.000Z',
        retrievedAt: '2026-06-13T09:31:00.000Z',
      },
      {
        symbol: 'RELIANCE',
        companyName: 'Reliance Industries',
        sector: 'Energy',
        industry: 'Oil & Gas',
        marketCap: 19_000_000_000_000,
      },
    );

    expect(telemetry.peRatio).toBeNull();
    expect(telemetry.fiftyTwoWeekRange).toEqual({ low: null, high: null, current: 1400 });
    expect(telemetry.healthStatus).toBeNull();
    expect(telemetry.lastUpdated).toBe('2026-06-13T09:30:00.000Z');
    expect(telemetry.marketCap.availability).toBe('real');
  });

  it('marks market cap and quote timestamp unavailable when source values are absent', () => {
    const telemetry = buildCompanyTelemetry(
      {
        symbol: 'INFY',
        exchange: 'Data unavailable',
        price: 0,
        change: 0,
        changePercent: 0,
      },
      {
        symbol: 'INFY',
        companyName: 'Infosys',
        sector: 'Technology',
        industry: 'IT Services',
      },
    );

    expect(telemetry.marketCap).toEqual({
      numeric: null,
      formatted: 'Data unavailable',
      availability: 'unavailable',
    });
    expect(telemetry.fiftyTwoWeekRange.current).toBeNull();
    expect(telemetry.lastUpdated).toBeNull();
    expect(telemetry.availability).toBe('unavailable');
  });
});
