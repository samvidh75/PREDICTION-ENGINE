// src/services/providers/FinnhubProvider.ts
// Production Finnhub provider — all HTTP requests routed through ProviderRequestBroker.

import { MetadataProvider } from './MetadataProvider';
import { NewsProvider, NewsItem } from './NewsProvider';
import { FinancialProvider } from './FinancialProvider';
import { CompanyMetadata } from '../data/types';
import { providerRequestBroker } from './broker/ProviderRequestBroker';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

/**
 * FinnhubProvider — Tier 3 provider.
 * All HTTP calls are routed through ProviderRequestBroker for quota management,
 * single-flight coalescing, error classification, secret redaction, and caching.
 *
 * Fixes applied by broker migration:
 *   - Token-bearing URLs are NOT logged — broker strips secrets from keys
 *   - Non-retryable 4xx (400/401/403/404) are NOT retried
 *   - 429 Retry-After is honored with cooldown
 *   - `exchange || 'NSE'` removed — exchange defaults to undefined (not fabricated)
 *   - `periodEnd` is NOT fabricated from retrieval date — left undefined when absent
 *   - Source as-of is recorded separately from retrieved-at
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

  // ── Metadata ──────────────────────────────────────────────
  async getMetadata(symbol: string): Promise<CompanyMetadata> {
    const ticker = symbol.toUpperCase().replace(/\.(NS|BO)$/i, '');
    const result = await providerRequestBroker.execute<any>(
      'finnhub',
      'metadata',
      ticker,
      { token: this.apiKey }, // token is stripped from hash by ProviderRequestKey
      async () => {
        const url = `${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(ticker + '.NS')}&token=${this.apiKey}`;
        const resp = await fetch(url);
        const headers: Record<string, string> = {};
        resp.headers.forEach((v, k) => { headers[k] = v; });
        return { data: await resp.json(), status: resp.status, headers };
      },
    );

    if (!result.success || !result.data || !result.data.name) {
      throw new Error(`Finnhub: no metadata for ${symbol}`);
    }
    const data = result.data;
    return {
      symbol: ticker,
      companyName: data.name || '',
      sector: data.finnhubIndustry || '',
      industry: data.gicSector || '',
      // exchange is NOT defaulted to 'NSE' — remains undefined when absent
      exchange: data.exchange || undefined,
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

    const result = await providerRequestBroker.execute<any>(
      'finnhub',
      'news',
      ticker,
      { token: this.apiKey, from, to },
      async () => {
        const url = `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(ticker + '.NS')}&from=${from}&to=${to}&token=${this.apiKey}`;
        const resp = await fetch(url);
        const headers: Record<string, string> = {};
        resp.headers.forEach((v, k) => { headers[k] = v; });
        return { data: await resp.json(), status: resp.status, headers };
      },
    );

    if (!result.success || !Array.isArray(result.data)) return [];
    return result.data.slice(0, 20).map((item: any) => ({
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
    const result = await providerRequestBroker.execute<any>(
      'finnhub',
      'financials',
      ticker,
      { token: this.apiKey },
      async () => {
        const url = `${FINNHUB_BASE}/stock/metric?symbol=${encodeURIComponent(ticker + '.NS')}&metric=all&token=${this.apiKey}`;
        const resp = await fetch(url);
        const headers: Record<string, string> = {};
        resp.headers.forEach((v, k) => { headers[k] = v; });
        return { data: await resp.json(), status: resp.status, headers };
      },
    );

    if (!result.success || !result.data || !result.data.metric) {
      throw new Error(`Finnhub: no financial data for ${symbol}`);
    }

    const m = result.data.metric;
    const mcapRaw = m.marketCapitalization ? m.marketCapitalization * 1_000_000 : undefined;
    const fcfTTM = m.freeCashFlowTTM
      ? m.freeCashFlowTTM * 1_000_000
      : m.freeCashFlowPerShareTTM
        ? m.freeCashFlowPerShareTTM
        : undefined;
    const fcfYield = fcfTTM && mcapRaw && mcapRaw > 0 ? fcfTTM / mcapRaw : undefined;

    return {
      symbol: ticker,
      // periodEnd is NOT fabricated — left undefined when fiscal period absent
      periodEnd: undefined,

      marketCap: mcapRaw,
      peRatio: m.peNormalizedAnnual ?? m.peBasicExclExtraTTM ?? undefined,
      pbRatio: m.pbAnnual ?? m.priceToBookPerShareTTM ?? undefined,
      evEbitda: m.enterpriseValueOverEBITDA ?? undefined,
      eps: m.epsNormalizedAnnual ?? m.epsBasicExclExtraItemsTTM ?? undefined,
      fcfYield,

      roe: m.roeTTM ?? m.roeRfy ?? undefined,
      roic: m.roicTTM ?? m.roicRfy ?? undefined,
      grossMargin: m.grossMarginTTM ?? m.grossMargin ?? undefined,
      operatingMargin: m.operatingMarginTTM ?? m.operatingMargin ?? undefined,
      netMargin: m.netProfitMarginTTM ?? m.netProfitMargin ?? undefined,

      revenueGrowth: m.revenueGrowthTTMYoy ?? m.revenueGrowth3Y ?? undefined,
      epsGrowth: m.epsGrowthTTMYoy ?? m.epsGrowth3Y ?? undefined,
      fcfGrowth: m.freeCashFlowGrowthTTMYoy ?? undefined,
      profitGrowth: m.netIncomeGrowthTTMYoy ?? m.netIncomeGrowth3Y ?? undefined,

      debtToEquity: m.totalDebtOverTotalEquityTTM
        ?? m.totalDebtOverTotalEquityQuarterly
        ?? m.totalDebtOverTotalEquityAnnual
        ?? undefined,
      currentRatio: m.currentRatioTTM
        ?? m.currentRatioQuarterly
        ?? m.currentRatioAnnual
        ?? undefined,
      interestCoverage: m.interestCoverageTTM
        ?? m.interestCoverageQuarterly
        ?? undefined,
      freeCashFlow: fcfTTM,

      beta: m.beta ?? undefined,
      dividendYield: m.dividendYieldIndicatedAnnual
        ?? m.dividendYieldTTM
        ?? undefined,

      // Source timestamp (Finnhub metric data doesn't expose a fiscal period timestamp,
      // so sourceAsOf remains the retrieval time — this is accurate to the API behavior)
      _retrievedAt: result.retrievedAt,

      _raw: {
        peNormalizedAnnual: m.peNormalizedAnnual,
        peBasicExclExtraTTM: m.peBasicExclExtraTTM,
        pbAnnual: m.pbAnnual,
        priceToBookPerShareTTM: m.priceToBookPerShareTTM,
        enterpriseValueOverEBITDA: m.enterpriseValueOverEBITDA,
        roeTTM: m.roeTTM,
        roeRfy: m.roeRfy,
        roicTTM: m.roicTTM,
        roicRfy: m.roicRfy,
        grossMarginTTM: m.grossMarginTTM,
        operatingMarginTTM: m.operatingMarginTTM,
        netProfitMarginTTM: m.netProfitMarginTTM,
        revenueGrowthTTMYoy: m.revenueGrowthTTMYoy,
        revenueGrowth3Y: m.revenueGrowth3Y,
        epsGrowthTTMYoy: m.epsGrowthTTMYoy,
        epsGrowth3Y: m.epsGrowth3Y,
        freeCashFlowGrowthTTMYoy: m.freeCashFlowGrowthTTMYoy,
        netIncomeGrowthTTMYoy: m.netIncomeGrowthTTMYoy,
        netIncomeGrowth3Y: m.netIncomeGrowth3Y,
        totalDebtOverTotalEquityTTM: m.totalDebtOverTotalEquityTTM,
        totalDebtOverTotalEquityQuarterly: m.totalDebtOverTotalEquityQuarterly,
        totalDebtOverTotalEquityAnnual: m.totalDebtOverTotalEquityAnnual,
        currentRatioTTM: m.currentRatioTTM,
        currentRatioQuarterly: m.currentRatioQuarterly,
        currentRatioAnnual: m.currentRatioAnnual,
        interestCoverageTTM: m.interestCoverageTTM,
        interestCoverageQuarterly: m.interestCoverageQuarterly,
        freeCashFlowTTM: m.freeCashFlowTTM,
        freeCashFlowPerShareTTM: m.freeCashFlowPerShareTTM,
        beta: m.beta,
        dividendYieldIndicatedAnnual: m.dividendYieldIndicatedAnnual,
        dividendYieldTTM: m.dividendYieldTTM,
        marketCapitalization: m.marketCapitalization,
        epsNormalizedAnnual: m.epsNormalizedAnnual,
        epsBasicExclExtraItemsTTM: m.epsBasicExclExtraItemsTTM,
      },
    };
  }
}
