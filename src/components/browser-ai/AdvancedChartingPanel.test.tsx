import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdvancedChartingPanel, { toCandles } from './AdvancedChartingPanel';

/**
 * Honest-data guarantees for AdvancedChartingPanel:
 *  - indicators are computed from real PSE price history, never Math.random()
 *  - when the API can't serve history, the panel renders an explicit
 *    "not available" state instead of fabricating candles / signals.
 */

function realSeriesCandles(count = 40): Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }> {
  const out: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }> = [];
  let close = 30;
  for (let i = 0; i < count; i++) {
    const open = close + (i % 3 === 0 ? 0.1 : -0.1);
    const high = Math.max(open, close) + 0.2;
    const low = Math.min(open, close) - 0.2;
    close += 0.15;
    const time = `2026-0${(i % 9) + 1}-${String((i % 27) + 1).padStart(2, '0')}`;
    out.push({ time, open, high, low, close, volume: 1_000_000 + i * 1000 });
  }
  return out;
}

// The real /api/stock/:symbol payload: a single flat daily close+volume
// series under `priceChart` (no pre-bucketed `priceHistory`).
function realFlatSeries(count = 40): Array<{ date: string; close: number; volume: number }> {
  const out: Array<{ date: string; close: number; volume: number }> = [];
  let close = 30;
  for (let i = 0; i < count; i++) {
    close += 0.25;
    const date = `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`;
    out.push({ date, close, volume: 1_000_000 + i * 1000 });
  }
  return out;
}

function mockApi(payload: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('toCandles (real history → CandleData)', () => {
  it('maps OHLC series with parsed timestamps, sorted ascending', () => {
    const candles = toCandles([
      { time: '2026-07-02', open: 10, high: 12, low: 9, close: 11, volume: 500 },
      { time: '2026-07-01', open: 9, high: 10, low: 8, close: 10, volume: 400 },
    ]);
    expect(candles).toHaveLength(2);
    expect(candles[0].timestamp).toBe(Date.parse('2026-07-01'));
    expect(candles[1].timestamp).toBe(Date.parse('2026-07-02'));
    expect(candles[1].close).toBe(11);
    expect(candles[1].volume).toBe(500);
  });

  it('falls back to a flat price line when OHLC is missing', () => {
    const candles = toCandles([{ label: '2026-07-01', price: 100 }]);
    expect(candles).toHaveLength(1);
    expect(candles[0].open).toBe(100);
    expect(candles[0].high).toBe(100);
    expect(candles[0].low).toBe(100);
    expect(candles[0].close).toBe(100);
  });

  it('defaults a flat close-only day (real priceChart) into a flat candle', () => {
    // The real EODHD daily feed carries only date/close/volume — no OHLC.
    // open/high/low must default to close (a price line), never 0.
    const candles = toCandles([
      { date: '2026-07-01', close: 88.5, volume: 500 },
      { date: '2026-07-02', close: 90, volume: 700 },
    ]);
    expect(candles).toHaveLength(2);
    expect(candles[0]).toEqual({ timestamp: Date.parse('2026-07-01'), open: 88.5, high: 88.5, low: 88.5, close: 88.5, volume: 500 });
    expect(candles[1]).toEqual({ timestamp: Date.parse('2026-07-02'), open: 90, high: 90, low: 90, close: 90, volume: 700 });
  });

  it('drops invalid rows (zero/NaN close, unparseable timestamp)', () => {
    const candles = toCandles([
      { time: '2026-07-01', close: 0, open: 0, high: 0, low: 0, volume: 0 },
      { time: 'not-a-date', close: 5, open: 5, high: 5, low: 5, volume: 1 },
      { time: '2026-07-02', close: 6, open: 6, high: 6, low: 6, volume: 1 },
    ]);
    expect(candles).toHaveLength(1);
    expect(candles[0].close).toBe(6);
  });
});

describe('AdvancedChartingPanel (honest data surface)', () => {
  it('renders indicators from real API price history and labels the source', async () => {
    mockApi({ ok: true, priceChart: realFlatSeries() });
    render(<AdvancedChartingPanel symbol="SMPH" />);
    const header = await screen.findByText(/Technical Analysis — SMPH/i);
    expect(header).toBeTruthy();
    expect(screen.getByText(/Computed from real PSE daily prices/i)).toBeTruthy();
    fireEvent.click(header);
    expect(await screen.findByText(/RSI \(14\)/i)).toBeTruthy();
  });

  it('still honors a priceHistory bucket when a future endpoint ships one', async () => {
    mockApi({ ok: true, priceHistory: { '3M': realSeriesCandles() }, priceChart: [] });
    render(<AdvancedChartingPanel symbol="BDO" />);
    const header = await screen.findByText(/Technical Analysis — BDO/i);
    expect(header).toBeTruthy();
    fireEvent.click(header);
    expect(await screen.findByText(/RSI \(14\)/i)).toBeTruthy();
  });

  it('shows an honest unavailable state instead of simulated signals when history is empty', async () => {
    mockApi({ ok: true, priceHistory: {} });
    render(<AdvancedChartingPanel symbol="JFC" />);
    expect(
      await screen.findByText(/Real PSE price data for JFC isn't available right now/i),
    ).toBeTruthy();
    expect(screen.queryByText(/BUY SIGNAL/i)).toBeNull();
    expect(screen.queryByText(/SELL SIGNAL/i)).toBeNull();
  });

  it('shows the honest unavailable state when the API request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    render(<AdvancedChartingPanel symbol="SMPH" />);
    expect(
      await screen.findByText(/isn't available right now — indicators are not shown rather than simulated/i),
    ).toBeTruthy();
  });
});
