import { describe, expect, it } from 'vitest';
import { isMarketActionResponse } from './MarketActionBoard';

const validEnvelope = {
  status: 'partial',
  asOf: '2026-06-13',
  message: 'Latest prices are available but comparisons require prior snapshots.',
  data: {
    gainers: [],
    losers: [],
    volumeLeaders: [],
    sectorMovers: [],
    scannerPresets: [],
  },
  dataState: {
    availability: 'partial',
    sourceTables: ['daily_prices'],
    rowsAnalyzed: 1,
    rowsWithComparisons: 0,
    missingInputs: ['daily_prices.previous_trade_date'],
  },
};

describe('isMarketActionResponse', () => {
  it('accepts a structurally valid market-action envelope', () => {
    expect(isMarketActionResponse(validEnvelope)).toBe(true);
  });

  it('rejects empty and incomplete API payloads', () => {
    expect(isMarketActionResponse({})).toBe(false);
    expect(isMarketActionResponse({ status: 'partial', message: 'missing nested data' })).toBe(false);
    expect(isMarketActionResponse({ ...validEnvelope, data: { gainers: [] } })).toBe(false);
  });

  it('rejects unknown availability states', () => {
    expect(isMarketActionResponse({ ...validEnvelope, status: 'loading' })).toBe(false);
  });
});
