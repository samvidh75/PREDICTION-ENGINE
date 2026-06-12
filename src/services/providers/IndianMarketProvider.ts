// src/services/providers/IndianMarketProvider.ts
// Production Indian Market Provider — real HTTP requests via IndianAPI.in
// Supports NSE, BSE, quotes, metadata, and close-only historical datasets.

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

  private finite(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async fetchJson(url: string): Promise<any> {
    if (!this.apiKey) throw new Error('IndianAPI key is required. Set INDIANAPI_KEY.');
    return RetryPolicy.execute(async () => {
      const resp = await fetch(url, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
      if (!resp.ok) {
        throw new Error(`IndianAPI HTTP ${resp.status}: ${resp.statusText}`);
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
      ? (this.finite(currentPriceObj.BSE) ?? this.finite(s.price))
      : (this.finite(currentPriceObj.NSE) ?? this.finite(s.price));

    if (price === null || price <= 0) {
      throw new Error(`IndianAPI: quote price unavailable for ${clean}`);
    }

    const previousClose = this.finite(s.close);
    const changePercent = this.finite(s.percentChange) ?? this.finite(data.percentChange) ?? 0;
    const change = previousClose !== null ? price - previousClose : 0;
    let volume: number | undefined;
    if (data.keyMetrics?.priceandVolume) {
      const item = data.keyMetrics.priceandVolume.find((entry: any) => entry.key === 'avgTradingVolumeLast10Days');
      const averageVolumeLakhs = this.finite(item?.value);
      if (averageVolumeLakhs !== null && averageVolumeLakhs >= 0) volume = averageVolumeLakhs * 100_000;
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
    const marketCapCrore = this.finite(s.marketCap);

    return {
      symbol: clean,
      companyName: data.companyName || clean,
      sector: data.industry || '',
      industry: data.industry || '',
      exchange: isBse ? 'BSE' : 'NSE',
      marketCap: marketCapCrore === null ? undefined : marketCapCrore * 10_000_000,
      currency: 'INR',
      website: '',
    };
  }

  // ── Historical ────────────────────────────────────────────
  async getHistory(symbol: string, range: string = '1Y'): Promise<HistoricalPoint[]> {
    return this.getHistorical(symbol, range);
  }

  async getHistorical(symbol: string, range: string = '1Y'): Promise<HistoricalPoint[]> {
    const clean = this.cleanSymbol(symbol);
    let period = '1yr';
    const normalizedRange = range.toUpperCase();
    if (normalizedRange === '1D' || normalizedRange === '5D' || normalizedRange === '1M') period = '1m';
    else if (normalizedRange === '3M' || normalizedRange === '6M') period = '6m';
    else if (normalizedRange === '3Y') period = '3yr';
    else if (normalizedRange === '5Y') period = '5yr';
    else if (normalizedRange === '10Y') period = '10yr';
    else if (normalizedRange === 'MAX') period = 'max';

    const url = `https://stock.indianapi.in/historical_data?stock_name=${encodeURIComponent(clean)}&period=${period}&filter=price`;
    const data = await this.fetchJson(url);
    const priceDataset = data.datasets?.find((dataset: any) => dataset.metric === 'Price');

    if (priceDataset?.values?.length) {
      throw new Error(`IndianAPI: historical_data for ${clean} is close-only; refusing to synthesize OHLC candles`);
    }
    return [];
  }
}
