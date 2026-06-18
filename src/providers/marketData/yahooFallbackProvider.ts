/**
 * yahooFallbackProvider.ts — Yahoo Finance fallback market data provider.
 *
 * Wraps the existing YFinanceProvider to expose MarketDataProvider interface.
 * Used as fallback when IndianAPI is unavailable.
 */

import type { NormalizedQuote, NormalizedCandle, ProviderHealth, ProviderId, MarketDataProvider } from './types';

const FETCH_TIMEOUT = 8_000;

export class YahooFallbackProvider implements MarketDataProvider {
  readonly providerId: ProviderId = 'yahoo';

  async getQuote(symbol: string): Promise<NormalizedQuote> {
    const ticker = `${symbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockStoryBot/1.0)' },
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`Yahoo HTTP ${resp.status}`);
      }

      const json = await resp.json() as any;
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error('No Yahoo result');

      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];
      const lastIdx = (result.timestamp?.length ?? 1) - 1;
      const prevClose = meta.chartPreviousClose ?? quote?.close?.[lastIdx - 1] ?? null;
      const lastPrice = meta.regularMarketPrice ?? quote?.close?.[lastIdx] ?? null;

      if (lastPrice == null || !Number.isFinite(lastPrice)) {
        throw new Error('Invalid price from Yahoo');
      }

      return {
        symbol,
        exchange: 'NSE',
        lastPrice,
        previousClose: prevClose != null && Number.isFinite(prevClose) ? prevClose : null,
        open: meta.regularMarketOpen ?? null,
        high: meta.regularMarketDayHigh ?? null,
        low: meta.regularMarketDayLow ?? null,
        volume: meta.regularMarketVolume ?? null,
        timestamp: new Date().toISOString(),
        provider: 'yahoo',
        sourceQuality: 'delayed',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Yahoo fallback error for ${symbol}: ${msg}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async getHistoricalDaily(symbol: string, fromDate: string, toDate: string): Promise<NormalizedCandle[]> {
    const ticker = `${symbol}.NS`;
    const fromTs = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTs = Math.floor(new Date(toDate).getTime() / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${fromTs}&period2=${toTs}&interval=1d`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT * 2);

    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockStoryBot/1.0)' },
        signal: controller.signal,
      });

      if (!resp.ok) throw new Error(`Yahoo HTTP ${resp.status}`);

      const json = await resp.json() as any;
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error('No Yahoo result');

      const timestamps: number[] = result.timestamp ?? [];
      const q = result.indicators?.quote?.[0] || {};
      const adj = result.indicators?.adjclose?.[0]?.adjclose ?? [];

      const candles: NormalizedCandle[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i];
        if (c == null || !Number.isFinite(c)) continue;

        candles.push({
          symbol,
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          open: Number.isFinite(o) ? o : c,
          high: Number.isFinite(h) ? h : c,
          low: Number.isFinite(l) ? l : c,
          close: c,
          volume: v != null && Number.isFinite(v) ? Math.round(v) : 0,
          provider: 'yahoo',
          sourceQuality: 'fallback',
        });
      }

      return candles;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Yahoo historical fallback error for ${symbol}: ${msg}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async checkHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const resp = await fetch(
        'https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS?range=1d&interval=1d',
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockStoryBot/1.0)' },
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        },
      );
      const latency = Date.now() - start;
      return {
        provider: 'yahoo',
        status: resp.ok ? 'healthy' : 'provider_error',
        latencyMs: latency,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return { provider: 'yahoo', status: 'provider_unreachable', latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    }
  }
}
