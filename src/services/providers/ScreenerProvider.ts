import { FinancialProvider, FinancialData } from './FinancialProvider';
import { ScreenerParser, ScreenerParsedResult } from './parsers/ScreenerParser';
import { getSharedProviderRequestBroker } from './broker/createProviderRequestBroker';
import { getCurrentIngestionRunId } from '../acquisition/IngestionRunContext';
import { authorizeProviderIngestion, getProviderUserAgent } from './authorization/ProviderAuthorization';
import type { ProviderAuthorizationConfig } from './authorization/types';
import {
  normalizeSymbol,
  parseIndianNumber,
  parseCurrencyToInr,
  finiteNumberOrNull,
} from './normalization/FinancialNormalization';

const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_POLICY = { ttlMs: 3_600_000, staleWindowMs: 3_600_000, negativeTtlMs: 120_000 };

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

export class ScreenerProvider implements FinancialProvider {
  static readonly PROVIDER_ID = 'screener';
  static readonly BASE_URL = 'https://www.screener.in';
  static readonly REQUESTS_PER_MINUTE = 6;
  static readonly CONCURRENCY_LIMIT = 1;

  private parser = new ScreenerParser();

  constructor(private authConfig?: ProviderAuthorizationConfig) {}

  async getFinancials(symbol: string): Promise<FinancialData> {
    if (this.authConfig) {
      const gate = authorizeProviderIngestion('screener', this.authConfig);
      if (!gate.passed) {
        const err = new Error(`PROVIDER_DISABLED: ${gate.reason}`);
        err.name = 'PROVIDER_DISABLED';
        throw err;
      }
    }

    const clean = normalizeSymbol(symbol);
    const url = `${ScreenerProvider.BASE_URL}/company/${encodeURIComponent(clean)}/`;
    const html = await this.fetchPage(url, clean);
    const parsed = this.parser.parseRatiosPage(html);
    return this.parsedToFinancialData(clean, parsed);
  }

  private async fetchPage(url: string, symbol: string): Promise<string> {
    const userAgent = this.authConfig
      ? getProviderUserAgent(this.authConfig)
      : 'StockStory/screener (research project; contact: dev@stockstory.org)';

    const result = await (await getSharedProviderRequestBroker()).execute(
      ScreenerProvider.PROVIDER_ID,
      'financials',
      symbol,
      { url },
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
          const resp = await fetch(url, {
            headers: { 'User-Agent': userAgent },
            signal: controller.signal,
          });
          const text = await resp.text();
          return {
            data: text,
            status: resp.status,
            headers: headersToRecord(resp.headers),
            sourceAsOf: new Date().toISOString(),
          };
        } finally {
          clearTimeout(timeout);
        }
      },
      {
        cachePolicy: CACHE_POLICY,
        runId: getCurrentIngestionRunId(),
        timeoutMs: REQUEST_TIMEOUT_MS,
      },
    );

    if (!result.success || result.data === null) {
      const err = new Error(
        `PROVIDER_NETWORK_ERROR: Screener.in unavailable for ${symbol} (${result.statusClass})`,
      );
      err.name = 'PROVIDER_NETWORK_ERROR';
      throw err;
    }

    return result.data;
  }

  private parsedToFinancialData(symbol: string, parsed: ScreenerParsedResult): FinancialData {
    const r = parsed.ratios;

    const mapRatio = (key: string): number | null => {
      const raw = r[key];
      if (!raw) return null;
      if (raw.includes('%')) {
        return parseIndianNumber(raw);
      }
      if (key === 'Market Cap' || key === 'Free Float') {
        return parseIndianNumber(raw);
      }
      return parseIndianNumber(raw);
    };

    const mapFinancial = (key: string): number | null => {
      const raw = r[key];
      if (!raw) return null;
      return parseCurrencyToInr(raw);
    };

    return {
      symbol,
      companyName: parsed.companyName,
      sector: parsed.sector,
      isin: parsed.isin || undefined,
      snapshotDate: new Date().toISOString().split('T')[0],
      periodEnd: null,
      peRatio: mapRatio('P/E'),
      pbRatio: mapRatio('P/B'),
      eps: mapRatio('Earnings per share'),
      dividendYield: mapRatio('Dividend Yield'),
      beta: mapRatio('Beta'),
      marketCap: mapRatio('Market Cap'),
      freeFloat: mapRatio('Free Float'),
      fcfYield: mapRatio('FCF Yield'),
      evEbitda: mapRatio('EV/EBITDA'),
      roa: mapRatio('ROA'),
      roe: mapRatio('ROE'),
      roic: mapRatio('ROIC'),
      roce: mapRatio('ROCE'),
      debtToEquity: mapRatio('Debt to Equity'),
      currentRatio: mapRatio('Current Ratio'),
      revenueGrowth: mapRatio('Revenue Growth'),
      profitGrowth: mapRatio('Profit Growth'),
      epsGrowth: mapRatio('EPS Growth'),
      fcfGrowth: mapRatio('FCF Growth'),
      grossMargin: mapRatio('Gross Margin'),
      operatingMargin: mapRatio('Operating Margin'),
      netMargin: mapRatio('Net Margin'),
      quality: null,
      revenue: mapFinancial('Revenue'),
      netProfit: mapFinancial('Net Profit'),
      operatingProfit: mapFinancial('Operating Profit'),
      grossProfit: mapFinancial('Gross Profit'),
      totalAssets: mapFinancial('Total Assets'),
      totalDebt: mapFinancial('Total Debt'),
      equity: mapFinancial('Equity'),
      _sources: {
        screener: 'Screener.in HTML scraper',
        screenerUrl: `${ScreenerProvider.BASE_URL}/company/${symbol}/`,
      },
      _raw: {
        ...r,
        companyName: parsed.companyName,
        sector: parsed.sector,
        isin: parsed.isin,
      },
    };
  }
}
