import { describe, expect, it } from 'vitest';
import { buildMarketActionResponse, type MarketActionRow } from './MarketActionService';

function row(overrides: Partial<MarketActionRow> = {}): MarketActionRow {
  return {
    symbol: 'RELIANCE',
    company_name: 'Reliance Industries',
    sector: 'Energy',
    trade_date: '2026-06-13',
    close: 102,
    volume: 1_000_000,
    previous_trade_date: '2026-06-12',
    previous_close: 100,
    market_cap: 19_000_000_000_000,
    pe_ratio: 22,
    roe: 18,
    revenue_growth: 12,
    rsi: 58,
    momentum: 4,
    volatility: 17,
    moving_average_distance: 3,
    ...overrides,
  };
}

describe('buildMarketActionResponse', () => {
  it('returns unavailable when no valid latest prices exist', () => {
    const response = buildMarketActionResponse([]);
    expect(response.status).toBe('unavailable');
    expect(response.data.gainers).toEqual([]);
    expect(response.dataState.missingInputs).toContain('daily_prices.latest_snapshot');
  });

  it('returns partial when latest prices exist without prior comparison dates', () => {
    const response = buildMarketActionResponse([
      row({ previous_trade_date: null, previous_close: null }),
    ]);

    expect(response.status).toBe('partial');
    expect(response.data.gainers).toEqual([]);
    expect(response.data.volumeLeaders).toHaveLength(1);
    expect(response.dataState.missingInputs).toContain('daily_prices.previous_trade_date');
    expect(response.data.scannerPresets.find((preset) => preset.id === 'value-watch')?.availability).toBe('real');
  });

  it('derives gainers, losers, sectors and certified scanner presets from populated snapshots', () => {
    const response = buildMarketActionResponse([
      row(),
      row({
        symbol: 'INFY',
        company_name: 'Infosys',
        sector: 'Technology',
        close: 95,
        previous_close: 100,
        volume: 2_000_000,
        market_cap: 7_000_000_000_000,
        pe_ratio: 18,
        momentum: -2,
        volatility: 12,
      }),
    ]);

    expect(response.status).toBe('real');
    expect(response.data.gainers[0]).toMatchObject({ symbol: 'RELIANCE', changePercent: 2 });
    expect(response.data.losers[0]).toMatchObject({ symbol: 'INFY', changePercent: -5 });
    expect(response.data.volumeLeaders[0].symbol).toBe('INFY');
    expect(response.data.sectorMovers).toEqual(expect.arrayContaining([
      { sector: 'Energy', averageChangePercent: 2, symbolsAnalyzed: 1 },
      { sector: 'Technology', averageChangePercent: -5, symbolsAnalyzed: 1 },
    ]));
    expect(response.data.scannerPresets.find((preset) => preset.id === 'value-watch')?.items[0].symbol).toBe('INFY');
    expect(response.data.scannerPresets.find((preset) => preset.id === 'positive-momentum')?.items.map((item) => item.symbol)).toEqual(['RELIANCE']);
  });
});
