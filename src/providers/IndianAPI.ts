import type { IQuoteProvider, IFundamentalsProvider, IHistoricalProvider } from './index';
import type { Quote, Fundamentals, HistoricalPrice } from '@/types';
import { ENV } from '@/config/env';
import { PROVIDER_URLS } from '@/config/providers';

export class IndianAPIProvider implements IQuoteProvider, IFundamentalsProvider, IHistoricalProvider {
  name = 'IndianAPI';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${PROVIDER_URLS.INDIANAPI.QUOTE}?name=RELIANCE`, {
        headers: { 'X-Api-Key': ENV.INDIANAPI_KEY },
      });
      return res.ok;
    } catch { return false; }
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    try {
      const res = await fetch(`${PROVIDER_URLS.INDIANAPI.QUOTE}?name=${symbol}`, {
        headers: { 'X-Api-Key': ENV.INDIANAPI_KEY },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const sd = data.stockDetailsReusableData;
      return {
        symbol,
        price: sd.price ?? sd.close,
        change: sd.percentChange ?? 0,
        changePercent: sd.percentChange ?? 0,
        open: null,
        high: null,
        low: null,
        volume: null,
        timestamp: new Date(),
        source: 'indianapi',
      };
    } catch { return null; }
  }

  async getHistory(symbol: string, range: string): Promise<HistoricalPrice[] | null> {
    try {
      const res = await fetch(
        `${PROVIDER_URLS.INDIANAPI.HISTORICAL}?stock_name=${symbol}&period=${range}&filter=price`,
        { headers: { 'X-Api-Key': ENV.INDIANAPI_KEY } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return (data.datasets?.[0]?.values ?? []).map(([date, close]: [string, number]) => ({
        date: date.slice(0, 10),
        open: close, high: close, low: close, close, volume: 0,
      }));
    } catch { return null; }
  }

  async getFundamentals(symbol: string): Promise<Fundamentals | null> {
    try {
      const res = await fetch(`${PROVIDER_URLS.INDIANAPI.FUNDAMENTALS}?name=${symbol}`, {
        headers: { 'X-Api-Key': ENV.INDIANAPI_KEY },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const f = data.fundamentals ?? {};
      const sd = data.stockDetailsReusableData ?? {};
      return {
        symbol,
        marketCap: sd.marketCap ?? null,
        peRatio: f.peRatio ?? null,
        pbRatio: f.pbRatio ?? null,
        roe: f.roe ?? null,
        roic: f.roic ?? null,
        roa: f.roa ?? null,
        debtEquity: f.debtToEquity ?? null,
        currentRatio: f.currentRatio ?? null,
        revenueGrowth: f.revenueGrowth ?? null,
        profitGrowth: f.profitGrowth ?? null,
        epsGrowth: f.epsGrowth ?? null,
        fcfGrowth: f.fcfGrowth ?? null,
        grossMargin: f.grossMargin ?? null,
        operatingMargin: f.operatingMargin ?? null,
        evEbitda: f.evEbitda ?? null,
        fcfYield: f.fcfYield ?? null,
        dividendYield: f.dividendYield ?? null,
        beta: f.beta ?? null,
        source: 'indianapi',
        fetchedAt: new Date(),
      };
    } catch { return null; }
  }
}
