import type { IQuoteProvider, IHistoricalProvider } from './index';
import type { Quote, HistoricalPrice } from '@/types';
import { PROVIDER_URLS } from '@/config/providers';

const YAHOO_SUFFIX = '.NS';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';

function yahooSymbol(symbol: string): string {
  return symbol + YAHOO_SUFFIX;
}

export class YahooProvider implements IQuoteProvider, IHistoricalProvider {
  name = 'Yahoo';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(
        `${PROVIDER_URLS.YAHOO.CHART}/${yahooSymbol('RELIANCE')}?range=1d&interval=1d`,
        { headers: { 'User-Agent': USER_AGENT } }
      );
      return res.ok;
    } catch { return false; }
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    try {
      const res = await fetch(
        `${PROVIDER_URLS.YAHOO.CHART}/${yahooSymbol(symbol)}?range=1d&interval=1m`,
        { headers: { 'User-Agent': USER_AGENT } }
      );
      if (!res.ok) return null;
      const json = await res.json();
      const result = json.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];
      const closes = quote?.close ?? [];
      const lastClose = closes.filter((c: number | null) => c !== null).pop() ?? meta.regularMarketPrice;

      return {
        symbol,
        price: lastClose,
        change: 0,
        changePercent: ((lastClose - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
        open: meta.regularMarketOpen ?? null,
        high: meta.regularMarketDayHigh ?? null,
        low: meta.regularMarketDayLow ?? null,
        volume: meta.regularMarketVolume ?? null,
        timestamp: new Date(meta.regularMarketTime * 1000),
        source: 'yahoo',
      };
    } catch { return null; }
  }

  async getHistory(symbol: string, range: string): Promise<HistoricalPrice[] | null> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const rangeDays: Record<string, number> = { '1D': 1, '5D': 5, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '3Y': 1095 };
      const days = rangeDays[range] ?? 365;
      const from = now - days * 86400;

      const res = await fetch(
        `${PROVIDER_URLS.YAHOO.CHART}/${yahooSymbol(symbol)}?period1=${from}&period2=${now}&interval=1d`,
        { headers: { 'User-Agent': USER_AGENT } }
      );
      if (!res.ok) return null;
      const json = await res.json();
      const result = json.chart?.result?.[0];
      if (!result) return null;

      const timestamps: number[] = result.timestamp ?? [];
      const quote = result.indicators?.quote?.[0];
      if (!quote) return null;

      return timestamps.map((t: number, i: number) => ({
        date: new Date(t * 1000).toISOString().slice(0, 10),
        open: quote.open?.[i] ?? 0,
        high: quote.high?.[i] ?? 0,
        low: quote.low?.[i] ?? 0,
        close: quote.close?.[i] ?? 0,
        volume: quote.volume?.[i] ?? 0,
      }));
    } catch { return null; }
  }
}
