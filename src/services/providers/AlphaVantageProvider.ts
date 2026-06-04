// src/services/providers/AlphaVantageProvider.ts
// Production Alpha Vantage provider — real HTTP requests.

import { PriceProvider } from './PriceProvider';
import { HistoricalProvider } from './HistoricalProvider';
import { StockQuote, HistoricalPoint } from '../data/types';
import { RetryPolicy } from './RetryPolicy';

const RETRY_OPTS = { retries: 2, minDelayMs: 1000, maxDelayMs: 5000 };

/**
 * AlphaVantageProvider — Tier 2 fallback for quotes and historical data.
 * Free tier: 25 requests/day. Handle rate limits gracefully.
 * Requires ALPHAVANTAGE_API_KEY or VITE_ALPHAVANTAGE_API_KEY.
 */
export class AlphaVantageProvider implements PriceProvider, HistoricalProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey
      || (typeof process !== 'undefined' && process.env?.ALPHA_VANTAGE_KEY)
      || (typeof process !== 'undefined' && process.env?.ALPHAVANTAGE_API_KEY)
      || (typeof process !== 'undefined' && process.env?.VITE_ALPHAVANTAGE_API_KEY)
      || '';
    if (!key || key === 'placeholder_alphavantage_key') {
      throw new Error('AlphaVantage API key not set (ALPHA_VANTAGE_KEY)');
    }
    this.apiKey = key;
  }

  private async fetchJson(url: string): Promise<any> {
    return RetryPolicy.execute(async () => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`AlphaVantage HTTP ${resp.status}`);
      const data = await resp.json();
      // Alpha Vantage returns a "Note" field when rate-limited
      if (data['Note']) throw new Error(`AlphaVantage: rate limited — ${data['Note']}`);
      if (data['Error Message']) throw new Error(`AlphaVantage: ${data['Error Message']}`);
      return data;
    }, RETRY_OPTS);
  }

  // ── Quote ─────────────────────────────────────────────────
  async getQuote(symbol: string): Promise<StockQuote> {
    const ticker = `${symbol.toUpperCase().replace(/\.(NS|BO)$/i, '')}.NSE`;
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      ticker,
    )}&apikey=${this.apiKey}`;
    const data = await this.fetchJson(url);
    const q = data['Global Quote'];
    if (!q || !q['05. price']) {
      throw new Error(`AlphaVantage: no quote for ${symbol}`);
    }
    const price = parseFloat(q['05. price']);
    const prevClose = parseFloat(q['08. previous close']) || price;
    return {
      symbol: symbol.toUpperCase().replace(/\.(NS|BO)$/i, ''),
      exchange: 'NSE',
      price,
      change: parseFloat(q['09. change']) || 0,
      changePercent: parseFloat((q['10. change percent'] || '0').replace('%', '')) || 0,
      volume: parseInt(q['06. volume'], 10) || 0,
      updatedAt: q['07. latest trading day'] || new Date().toISOString(),
    };
  }

  // ── Historical ────────────────────────────────────────────
  async getHistory(symbol: string, range: string = '1M'): Promise<HistoricalPoint[]> {
    const ticker = `${symbol.toUpperCase().replace(/\.(NS|BO)$/i, '')}.NSE`;
    const outputsize = ['1Y', '3Y', '5Y', '10Y', 'MAX'].includes(range.toUpperCase())
      ? 'full'
      : 'compact'; // compact = last 100 data points
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(
      ticker,
    )}&outputsize=${outputsize}&apikey=${this.apiKey}`;
    const data = await this.fetchJson(url);
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error(`AlphaVantage: no historical data for ${symbol}`);
    }
    const points: HistoricalPoint[] = Object.entries(timeSeries).map(
      ([date, v]: [string, any]) => ({
        date,
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
        volume: parseInt(v['6. volume'], 10),
        adjustedClose: parseFloat(v['5. adjusted close']) || undefined,
      }),
    );
    // Sort ascending by date
    points.sort((a, b) => a.date.localeCompare(b.date));
    return points;
  }
}
