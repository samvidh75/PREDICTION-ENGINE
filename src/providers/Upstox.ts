import type { IQuoteProvider, IHistoricalProvider } from './index';
import type { Quote, HistoricalPrice } from '@/types';
import { ENV } from '@/config/env';
import { PROVIDER_URLS } from '@/config/providers';

export class UpstoxProvider implements IQuoteProvider, IHistoricalProvider {
  name = 'Upstox';
  private baseUrl = ENV.NODE_ENV === 'development' ? PROVIDER_URLS.UPSTOX.SANDBOX : PROVIDER_URLS.UPSTOX.BASE;

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${ENV.UPSTOX_ACCESS_TOKEN}`,
      'Accept': 'application/json',
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(
        `${this.baseUrl}/market-quote/ltp?instrument_key=NSE_EQ|INE002A01018`,
        { headers: this.headers() }
      );
      return res.ok;
    } catch { return false; }
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    try {
      const res = await fetch(
        `${this.baseUrl}/market-quote/ltp?instrument_key=NSE_EQ|${symbol}`,
        { headers: this.headers() }
      );
      if (!res.ok) return null;
      const json = await res.json();
      const entry = json.data?.[`NSE_EQ|${symbol}`];
      if (!entry) return null;

      return {
        symbol,
        price: entry.last_price,
        change: entry.last_price - entry.ohlc?.close,
        changePercent: entry.ohlc?.close ? ((entry.last_price - entry.ohlc.close) / entry.ohlc.close) * 100 : 0,
        open: entry.ohlc?.open ?? null,
        high: entry.ohlc?.high ?? null,
        low: entry.ohlc?.low ?? null,
        volume: entry.volume ?? null,
        timestamp: new Date(),
        source: 'upstox',
      };
    } catch { return null; }
  }

  async getHistory(symbol: string, range: string): Promise<HistoricalPrice[] | null> {
    try {
      const now = new Date();
      const rangeDays: Record<string, number> = { '1D': 1, '5D': 5, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '3Y': 1095 };
      const days = rangeDays[range] ?? 365;
      const from = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
      const to = now.toISOString().slice(0, 10);

      const res = await fetch(
        `${this.baseUrl}/historical/NSE_EQ|${symbol}/day/${from}/${to}`,
        { headers: this.headers() }
      );
      if (!res.ok) return null;
      const json = await res.json();
      const candles: Array<[string, number, number, number, number, number, number]> = json.data?.candles ?? [];
      return candles.map(([date, open, high, low, close, volume]) => ({
        date: date.slice(0, 10),
        open, high, low, close, volume,
      }));
    } catch { return null; }
  }
}
