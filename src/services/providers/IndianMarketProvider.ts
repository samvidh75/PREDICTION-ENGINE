// src/services/providers/IndianMarketProvider.ts
// Production Indian Market Provider — real HTTP requests via IndianAPI.in
// Supports NSE, BSE, Quotes, Metadata, and Historical price candles.

import { PriceProvider } from './PriceProvider';
import { MetadataProvider } from './MetadataProvider';
import { HistoricalProvider } from './HistoricalProvider';
import { StockQuote, CompanyMetadata, HistoricalPoint } from '../data/types';
import { RetryPolicy } from './RetryPolicy';

const RETRY_OPTS = { retries: 2, minDelayMs: 500, maxDelayMs: 3000 };

export class IndianMarketProvider implements PriceProvider, MetadataProvider, HistoricalProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || (typeof process !== 'undefined' && process.env?.INDIANAPI_KEY) || '';
    this.apiKey = key;
    if (!key) {
      console.warn('IndianMarket: INDIANAPI_KEY is not configured in the environment');
    }
  }

  private cleanSymbol(symbol: string): string {
    return symbol.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, '');
  }

  private async fetchJson(url: string): Promise<any> {
    return RetryPolicy.execute(async () => {
      const resp = await fetch(url, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
      if (!resp.ok) {
        throw new Error(`IndianAPI HTTP ${resp.status}: ${resp.statusText} for ${url}`);
      }
      return resp.json();
    }, RETRY_OPTS);
  }

  // ── Quote ─────────────────────────────────────────────────
  async getQuote(symbol: string): Promise<StockQuote> {
    const clean = this.cleanSymbol(symbol);
    const url = `https://stock.indianapi.in/stock?name=${encodeURIComponent(clean)}`;
    const data = await this.fetchJson(url);

    const s = data.stockDetailsReusableData || {};
    const currentPriceObj = data.currentPrice || {};
    const isBse = /\.(BO|BSE)$/i.test(symbol);

    const price = isBse
      ? (parseFloat(currentPriceObj.BSE) || parseFloat(s.price) || 0)
      : (parseFloat(currentPriceObj.NSE) || parseFloat(s.price) || 0);

    const changePercent = parseFloat(s.percentChange) || data.percentChange || 0;
    const prevClose = parseFloat(s.close) || 0;
    const change = prevClose ? price - prevClose : 0;

    let volume = 0;
    if (data.keyMetrics?.priceandVolume) {
      const item = data.keyMetrics.priceandVolume.find((x: any) => x.key === 'avgTradingVolumeLast10Days');
      if (item && item.value) {
        volume = parseFloat(item.value) * 100_000; // convert Lakhs to units
      }
    }

    return {
      symbol: clean,
      exchange: isBse ? 'BSE' : 'NSE',
      price,
      change,
      changePercent,
      volume,
      updatedAt: s.date && s.time ? new Date(`${s.date} ${s.time}`).toISOString() : new Date().toISOString(),
    };
  }

  // ── Metadata ──────────────────────────────────────────────
  async getMetadata(symbol: string): Promise<CompanyMetadata> {
    const clean = this.cleanSymbol(symbol);
    const url = `https://stock.indianapi.in/stock?name=${encodeURIComponent(clean)}`;
    const data = await this.fetchJson(url);

    const s = data.stockDetailsReusableData || {};
    const isBse = /\.(BO|BSE)$/i.test(symbol);

    // Convert Market Cap from Crore INR to actual INR
    const marketCap = s.marketCap ? parseFloat(s.marketCap) * 10_000_000 : undefined;

    return {
      symbol: clean,
      companyName: data.companyName || clean,
      sector: data.industry || '',
      industry: data.industry || '',
      exchange: isBse ? 'BSE' : 'NSE',
      marketCap,
      currency: 'INR',
      website: '',
    };
  }

  // ── Historical (Both getHistory and getHistorical for compatibility) ─
  async getHistory(symbol: string, range: string = '1Y'): Promise<HistoricalPoint[]> {
    return this.getHistorical(symbol, range);
  }

  async getHistorical(symbol: string, range: string = '1Y'): Promise<HistoricalPoint[]> {
    const clean = this.cleanSymbol(symbol);
    
    // Map ranges
    let period = '1yr';
    const r = range.toUpperCase();
    if (r === '1D' || r === '5D' || r === '1M') period = '1m';
    else if (r === '3M' || r === '6M') period = '6m';
    else if (r === '1Y') period = '1yr';
    else if (r === '3Y') period = '3yr';
    else if (r === '5Y') period = '5yr';
    else if (r === '10Y') period = '10yr';
    else if (r === 'MAX') period = 'max';

    const url = `https://stock.indianapi.in/historical_data?stock_name=${encodeURIComponent(clean)}&period=${period}&filter=price`;
    const data = await this.fetchJson(url);

    const priceDs = data.datasets?.find((ds: any) => ds.metric === 'Price');
    const volumeDs = data.datasets?.find((ds: any) => ds.metric === 'Volume');

    const pointsMap = new Map<string, HistoricalPoint>();
    
    if (priceDs && Array.isArray(priceDs.values)) {
      for (const [date, val] of priceDs.values) {
        const price = parseFloat(val) || 0;
        pointsMap.set(date, {
          date,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 0,
        });
      }
    }

    if (volumeDs && Array.isArray(volumeDs.values)) {
      for (const [date, val] of volumeDs.values) {
        const point = pointsMap.get(date);
        if (point) {
          point.volume = typeof val === 'number' ? val : (parseFloat(val) || 0);
        }
      }
    }

    return Array.from(pointsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}
