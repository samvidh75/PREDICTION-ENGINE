// src/services/providers/FinnhubProvider.ts
// Production Finnhub provider — real HTTP requests.

import { MetadataProvider } from './MetadataProvider';
import { NewsProvider, NewsItem } from './NewsProvider';
import { FinancialProvider } from './FinancialProvider';
import { CompanyMetadata } from '../data/types';
import { getSharedProviderRequestBroker } from './broker/createProviderRequestBroker';
import { getCurrentIngestionRunId } from '../acquisition/IngestionRunContext';

const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_POLICIES = {
  metadata: { ttlMs: 300_000, staleWindowMs: 300_000, negativeTtlMs: 60_000 },
  financials: { ttlMs: 3_600_000, staleWindowMs: 3_600_000, negativeTtlMs: 120_000 },
  news: { ttlMs: 120_000, staleWindowMs: 120_000, negativeTtlMs: 30_000 },
} as const;

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

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

  private async fetchJson(operation: 'metadata' | 'financials' | 'news', symbol: string, params: Record<string, unknown>, url: string): Promise<{ data: any; sourceAsOf?: string }> {
    if (!this.apiKey) {
      throw new Error('Finnhub API key not set (FINNHUB_KEY)');
    }

    const clean = this.cleanSymbol(symbol);
    const result = await (await getSharedProviderRequestBroker()).execute('finnhub', operation, clean, params, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const resp = await fetch(url, { signal: controller.signal });
        const data = await this.readJsonSafely(resp);
        return {
          data,
          status: resp.status,
          headers: headersToRecord(resp.headers),
          sourceAsOf: this.sourceAsOf(data),
        };
      } finally {
        clearTimeout(timeout);
      }
    }, {
      cachePolicy: CACHE_POLICIES[operation],
      runId: getCurrentIngestionRunId(),
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    if (!result.success || result.data === null) {
      throw new Error(`Finnhub ${operation} unavailable for ${clean}: ${result.statusClass}`);
    }

    return { data: result.data, sourceAsOf: this.sourceAsOf(result.data) };
  }

  private async readJsonSafely(resp: Response): Promise<any> {
    try {
      return await resp.json();
    } catch {
      return null;
    }
  }

  private cleanSymbol(symbol: string): string {
    return symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
  }

  private sourceAsOf(data: any): string | undefined {
    const sourceTimestamp = data?.metric?.periodEndDate ?? data?.periodEndDate ?? data?.asOfDate;
    return typeof sourceTimestamp === 'string' && sourceTimestamp.trim() ? sourceTimestamp : undefined;
  }

  // ── Metadata ──────────────────────────────────────────────
  async getMetadata(symbol: string): Promise<CompanyMetadata> {
    const ticker = this.cleanSymbol(symbol);
    // Finnhub uses ticker without exchange suffix for Indian stocks listed on NSE
    const providerSymbol = `${ticker}.NS`;
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(
      providerSymbol,
    )}&token=${this.apiKey}`;
    const { data } = await this.fetchJson('metadata', ticker, { providerSymbol }, url);
    if (!data || !data.name) {
      throw new Error(`Finnhub: no metadata for ${symbol}`);
    }
    return {
      symbol: ticker,
      companyName: data.name || '',
      sector: data.finnhubIndustry || '',
      industry: data.gicSector || '',
      exchange: data.exchange || undefined,
      marketCap: data.marketCapitalization ? data.marketCapitalization * 1_000_000 : undefined,
      currency: data.currency || 'INR',
      website: data.weburl || '',
    };
  }

  // ── News ──────────────────────────────────────────────────
  async getNews(symbol: string): Promise<NewsItem[]> {
    const ticker = this.cleanSymbol(symbol);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const from = weekAgo.toISOString().split('T')[0];
    const to = now.toISOString().split('T')[0];
    const providerSymbol = `${ticker}.NS`;
    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
      providerSymbol,
    )}&from=${from}&to=${to}&token=${this.apiKey}`;
    const { data } = await this.fetchJson('news', ticker, { providerSymbol, from, to }, url);
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
    const ticker = this.cleanSymbol(symbol);
    const providerSymbol = `${ticker}.NS`;
    const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
      providerSymbol,
    )}&metric=all&token=${this.apiKey}`;
    const { data, sourceAsOf } = await this.fetchJson('financials', ticker, { providerSymbol, metric: 'all' }, url);
    if (!data || !data.metric) {
      throw new Error(`Finnhub: no financial data for ${symbol}`);
    }
    const m = data.metric;

    const mcapRaw = m.marketCapitalization
      ? m.marketCapitalization * 1_000_000
      : undefined;

    const fcfTTM = m.freeCashFlowTTM
      ? m.freeCashFlowTTM * 1_000_000
      : m.freeCashFlowPerShareTTM
        ? m.freeCashFlowPerShareTTM
        : undefined;

    const fcfYield = fcfTTM && mcapRaw && mcapRaw > 0
      ? fcfTTM / mcapRaw
      : undefined;

    return {
      symbol: ticker,
      periodEnd: sourceAsOf,
      sourceAsOf,
      retrievedAt: new Date().toISOString(),

      // ── Valuation ───────────────────────────────────────
      marketCap: mcapRaw,
      peRatio: m.peNormalizedAnnual ?? m.peBasicExclExtraTTM ?? undefined,
      pbRatio: m.pbAnnual ?? m.priceToBookPerShareTTM ?? undefined,
      evEbitda: m.enterpriseValueOverEBITDA ?? undefined,
      eps: m.epsNormalizedAnnual ?? m.epsBasicExclExtraItemsTTM ?? undefined,
      fcfYield,

      // ── Profitability / Quality ─────────────────────────
      roe: m.roeTTM ?? m.roeRfy ?? undefined,
      roic: m.roicTTM ?? m.roicRfy ?? undefined,
      grossMargin: m.grossMarginTTM ?? m.grossMargin ?? undefined,
      operatingMargin: m.operatingMarginTTM ?? m.operatingMargin ?? undefined,
      netMargin: m.netProfitMarginTTM ?? m.netProfitMargin ?? undefined,

      // ── Growth ──────────────────────────────────────────
      revenueGrowth: m.revenueGrowthTTMYoy ?? m.revenueGrowth3Y ?? undefined,
      epsGrowth: m.epsGrowthTTMYoy ?? m.epsGrowth3Y ?? undefined,
      fcfGrowth: m.freeCashFlowGrowthTTMYoy ?? undefined,
      profitGrowth: m.netIncomeGrowthTTMYoy ?? m.netIncomeGrowth3Y ?? undefined,

      // ── Stability ───────────────────────────────────────
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

      // ── Risk / Market ───────────────────────────────────
      beta: m.beta ?? undefined,
      dividendYield: m.dividendYieldIndicatedAnnual
        ?? m.dividendYieldTTM
        ?? undefined,

      // ── Raw metric map for diagnostics ──────────────────
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
