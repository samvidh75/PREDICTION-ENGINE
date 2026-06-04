// src/services/providers/FinnhubProvider.ts
// Production Finnhub provider — real HTTP requests.

import { MetadataProvider } from './MetadataProvider';
import { NewsProvider, NewsItem } from './NewsProvider';
import { FinancialProvider } from './FinancialProvider';
import { CompanyMetadata } from '../data/types';
import { RetryPolicy } from './RetryPolicy';

const RETRY_OPTS = { retries: 2, minDelayMs: 500, maxDelayMs: 3000 };

/**
 * FinnhubProvider — Tier 3 provider.
 * Provides metadata, news, and financials via Finnhub.io REST API.
 * Requires environment variable VITE_FINNHUB_API_KEY or FINNHUB_API_KEY.
 */
export class FinnhubProvider implements MetadataProvider, NewsProvider, FinancialProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey
      || (typeof process !== 'undefined' && process.env?.FINNHUB_KEY)
      || (typeof process !== 'undefined' && process.env?.FINNHUB_API_KEY)
      || (typeof process !== 'undefined' && process.env?.VITE_FINNHUB_API_KEY)
      || '';
    if (!key) {
      throw new Error('Finnhub API key not set (FINNHUB_KEY)');
    }
    this.apiKey = key;
  }

  private async fetchJson(url: string): Promise<any> {
    return RetryPolicy.execute(async () => {
      const resp = await fetch(url);
      if (resp.status === 429) throw new Error('Finnhub: rate limited (429)');
      if (!resp.ok) throw new Error(`Finnhub HTTP ${resp.status}: ${resp.statusText}`);
      return resp.json();
    }, RETRY_OPTS);
  }

  // ── Metadata ──────────────────────────────────────────────
  async getMetadata(symbol: string): Promise<CompanyMetadata> {
    const ticker = symbol.toUpperCase().replace(/\.(NS|BO)$/i, '');
    // Finnhub uses ticker without exchange suffix for Indian stocks listed on NSE
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(
      ticker + '.NS',
    )}&token=${this.apiKey}`;
    const data = await this.fetchJson(url);
    if (!data || !data.name) {
      throw new Error(`Finnhub: no metadata for ${symbol}`);
    }
    return {
      symbol: ticker,
      companyName: data.name || '',
      sector: data.finnhubIndustry || '',
      industry: data.gicSector || '',
      exchange: data.exchange || 'NSE',
      marketCap: data.marketCapitalization ? data.marketCapitalization * 1_000_000 : undefined,
      currency: data.currency || 'INR',
      website: data.weburl || '',
    };
  }

  // ── News ──────────────────────────────────────────────────
  async getNews(symbol: string): Promise<NewsItem[]> {
    const ticker = symbol.toUpperCase().replace(/\.(NS|BO)$/i, '');
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const from = weekAgo.toISOString().split('T')[0];
    const to = now.toISOString().split('T')[0];
    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
      ticker + '.NS',
    )}&from=${from}&to=${to}&token=${this.apiKey}`;
    const data = await this.fetchJson(url);
    if (!Array.isArray(data)) return [];
    return data.slice(0, 20).map((item: any) => ({
      title: item.headline || '',
      url: item.url || '',
      source: item.source || '',
      summary: item.summary || '',
      datetime: item.datetime ? new Date(item.datetime * 1000).toISOString() : new Date().toISOString(),
    }));
  }

  // ── Financials ────────────────────────────────────────────
  async getFinancials(symbol: string): Promise<any> {
    const ticker = symbol.toUpperCase().replace(/\.(NS|BO)$/i, '');
    const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
      ticker + '.NS',
    )}&metric=all&token=${this.apiKey}`;
    const data = await this.fetchJson(url);
    if (!data || !data.metric) {
      throw new Error(`Finnhub: no financial data for ${symbol}`);
    }
    const m = data.metric;
    return {
      symbol: ticker,
      periodEnd: new Date().toISOString().split('T')[0],
      marketCap: m.marketCapitalization ? m.marketCapitalization * 1_000_000 : undefined,
      peRatio: m.peNormalizedAnnual ?? m.peBasicExclExtraTTM ?? undefined,
      eps: m.epsNormalizedAnnual ?? m.epsBasicExclExtraItemsTTM ?? undefined,
      dividendYield: m.dividendYieldIndicatedAnnual ?? undefined,
      beta: m.beta ?? undefined,
      revenue: m.revenuePerShareTTM ?? undefined,
    };
  }
}
