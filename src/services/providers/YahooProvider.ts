// src/services/providers/YahooProvider.ts
// Production Yahoo Finance provider — real HTTP requests, no mocks.
// As of June 2026: Yahoo v10 quoteSummary returns 401 (blocked).
// Yahoo v8 chart API works for price/volume data.
// Fundamentals (PE, ROE, D/E, etc.) must come from Finnhub or other providers.

import { PriceProvider } from './PriceProvider';
import { MetadataProvider } from './MetadataProvider';
import { HistoricalProvider } from './HistoricalProvider';
import { FinancialProvider } from './FinancialProvider';
import { StockQuote, CompanyMetadata, HistoricalPoint } from '../data/types';
import { getSharedProviderRequestBroker } from './broker/createProviderRequestBroker';

const REQUEST_TIMEOUT_MS = 10_000;

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

/**
 * Convert a provider exchange label or an explicitly resolved Yahoo ticker into
 * an Indian exchange label. Unknown values remain unavailable.
 */
export function normalizeYahooExchange(exchangeName?: unknown, resolvedTicker?: string): 'NSE' | 'BSE' | undefined {
  const label = typeof exchangeName === 'string' ? exchangeName.trim().toLowerCase() : '';
  if (/bse|bombay/.test(label)) return 'BSE';
  if (/nse|national stock exchange/.test(label)) return 'NSE';

  const ticker = (resolvedTicker || '').trim().toUpperCase();
  if (/\.BO$/.test(ticker)) return 'BSE';
  if (/\.NS$/.test(ticker)) return 'NSE';
  return undefined;
}

/** Convert a Yahoo epoch-seconds market timestamp into ISO format. */
export function marketTimestampFromEpoch(value: unknown): string | undefined {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return new Date(seconds * 1000).toISOString();
}

/**
 * YahooFinancials — structured output from Yahoo v8 chart API.
 *
 * NOTE: Yahoo v10 quoteSummary is currently blocked (401 Unauthorized).
 * The v8 chart API provides price/volume only — no PE, ROE, D/E, etc.
 *
 * Fields that CAN be derived from v8:
 *   - beta (from 2Y price history)
 *   - marketCap approximation (price * avg volume — unreliable, prefer Registry)
 *
 * For real fundamentals, use FinnhubProvider or other financial providers.
 */
export interface YahooFinancials {
  symbol: string;
  // From v8 meta
  marketCap?: number;
  // Derived from historical prices
  beta?: number;
  // These are NOT available from v8 — always null when Yahoo is sole provider
  peRatio?: undefined;
  pbRatio?: undefined;
  evEbitda?: undefined;
  eps?: undefined;
  fcfYield?: undefined;
  roe?: undefined;
  roic?: undefined;
  grossMargin?: undefined;
  operatingMargin?: undefined;
  revenueGrowth?: undefined;
  epsGrowth?: undefined;
  fcfGrowth?: undefined;
  profitGrowth?: undefined;
  debtToEquity?: undefined;
  currentRatio?: undefined;
  interestCoverage?: undefined;
  freeCashFlow?: undefined;
  dividendYield?: undefined;
  _raw?: Record<string, unknown>;
}

/**
 * YahooProvider — Tier 1 provider for price/volume/historical data.
 * Uses Yahoo Finance v8 chart API (public, no key required).
 *
 * Financial fundamentals are NOT available via v8.
 * ProviderCoordinator routes getFinancials() to Finnhub first.
 */
export class YahooProvider implements PriceProvider, MetadataProvider, HistoricalProvider, FinancialProvider {

  /** Map user-facing range strings to Yahoo chart API range params */
  private static RANGE_MAP: Record<string, string> = {
    '1D': '1d', '5D': '5d', '1M': '1mo', '3M': '3mo', '6M': '6mo',
    '1Y': '1y', '2Y': '2y', '3Y': '3y', '5Y': '5y', '10Y': '10y', 'MAX': 'max',
  };

  private normalizeSymbol(symbol: string): string {
    // If already suffixed with .NS or .BO, keep it.
    if (/\.(NS|BO)$/i.test(symbol)) return symbol.toUpperCase();
    // Operational lookup default for the Indian equity universe. Displayed
    // exchange still comes from provider evidence or this resolved ticker.
    return `${symbol.toUpperCase()}.NS`;
  }

  private async fetchJson(operation: 'quote' | 'metadata' | 'history', symbol: string, params: Record<string, unknown>, url: string): Promise<any> {
    const clean = symbol.replace(/\.(NS|BO)$/i, '').trim().toUpperCase();
    const result = await (await getSharedProviderRequestBroker()).execute('yahoo', operation, clean, params, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: controller.signal,
        });
        const data = await this.readJsonSafely(resp);
        return {
          data,
          status: resp.status,
          headers: headersToRecord(resp.headers),
          sourceAsOf: marketTimestampFromEpoch(data?.chart?.result?.[0]?.meta?.regularMarketTime),
        };
      } finally {
        clearTimeout(timeout);
      }
    });

    if (!result.success || result.data === null) {
      throw new Error(`Yahoo ${operation} unavailable for ${clean}: ${result.statusClass}`);
    }
    return result.data;
  }

  private async readJsonSafely(resp: Response): Promise<any> {
    try {
      return await resp.json();
    } catch {
      return null;
    }
  }

  // ── Quote ─────────────────────────────────────────────────
  async getQuote(symbol: string): Promise<StockQuote> {
    const ticker = this.normalizeSymbol(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`;
    const data = await this.fetchJson('quote', symbol, { ticker, range: '1d', interval: '1m' }, url);
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error(`Yahoo: no quote data for ${symbol}`);

    return {
      symbol: symbol.replace(/\.(NS|BO)$/i, '').toUpperCase(),
      exchange: normalizeYahooExchange(meta.exchangeName ?? meta.fullExchangeName, ticker) ?? 'Data unavailable',
      price: meta.regularMarketPrice ?? 0,
      change: (meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? 0),
      changePercent: meta.chartPreviousClose
        ? (((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100)
        : 0,
      volume: meta.regularMarketVolume ?? 0,
      updatedAt: marketTimestampFromEpoch(meta.regularMarketTime),
      retrievedAt: new Date().toISOString(),
    };
  }

  // ── Metadata ──────────────────────────────────────────────
  async getMetadata(symbol: string): Promise<CompanyMetadata> {
    const ticker = this.normalizeSymbol(symbol);
    // Use v8 chart API for name/exchange (v10 quoteSummary is blocked)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`;
    try {
      const data = await this.fetchJson('metadata', symbol, { ticker, range: '1d', interval: '1m' }, url);
      const meta = data?.chart?.result?.[0]?.meta ?? {};
      return {
        symbol: symbol.replace(/\.(NS|BO)$/i, '').toUpperCase(),
        companyName: meta.longName || meta.shortName || symbol,
        sector: '',
        industry: '',
        exchange: normalizeYahooExchange(meta.fullExchangeName ?? meta.exchangeName, ticker),
        marketCap: meta.marketCap ?? undefined,
        currency: meta.currency || undefined,
        website: '',
      };
    } catch {
      throw new Error(`Yahoo: chart unavailable for ${symbol}`);
    }
  }

  // ── Historical ──────────────────────────────────────────────
  async getHistory(symbol: string, range: string = '1M'): Promise<HistoricalPoint[]> {
    return this.getHistorical(symbol, range);
  }

  async getHistorical(symbol: string, range: string = '1M'): Promise<HistoricalPoint[]> {
    const ticker = this.normalizeSymbol(symbol);
    const yahooRange = YahooProvider.RANGE_MAP[range.toUpperCase()] || '1mo';
    const interval = ['1d', '5d'].includes(yahooRange) ? '5m' : '1d';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker,
    )}?range=${yahooRange}&interval=${interval}`;
    const data = await this.fetchJson('history', symbol, { ticker, range: yahooRange, interval }, url);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error(`Yahoo: no historical data for ${symbol}`);
    const timestamps: number[] = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};
    const adj = result.indicators?.adjclose?.[0]?.adjclose || [];
    const points: HistoricalPoint[] = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: q.open?.[i] ?? 0,
      high: q.high?.[i] ?? 0,
      low: q.low?.[i] ?? 0,
      close: q.close?.[i] ?? 0,
      volume: q.volume?.[i] ?? 0,
      adjustedClose: adj[i] ?? undefined,
    }));
    return points.filter(p => p.close !== null && p.close !== 0);
  }

  // ── Financials (v8 chart API only — fundamentals NOT available) ──
  async getFinancials(symbol: string): Promise<YahooFinancials> {
    const cleanSym = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();

    // Get 2Y historical data for beta derivation
    let beta: number | undefined;
    try {
      const hist = await this.getHistorical(symbol, '2Y');
      const prices = hist.map(p => p.adjustedClose ?? p.close).filter(p => p > 0);
      if (prices.length >= 60) {
        const returns: number[] = [];
        for (let i = 1; i < prices.length; i++) {
          returns.push(Math.log(prices[i] / prices[i - 1]));
        }
        const meanRet = returns.reduce((s, v) => s + v, 0) / returns.length;
        const variance = returns.reduce((s, v) => s + (v - meanRet) ** 2, 0) / returns.length;
        const annualVol = Math.sqrt(variance) * Math.sqrt(252);
        // Rough beta: assume market vol ≈ 18% annualized
        beta = Math.max(0.1, Math.min(annualVol / 0.18, 4.0));
      }
    } catch {
      // Beta unavailable — caller should fall back
    }

    // v10 quoteSummary is blocked (401). v8 chart has no fundamental fields.
    // Return what we can derive from v8; throw so ProviderCoordinator tries Finnhub.
    throw new Error(
      `Yahoo Financials: v10 quoteSummary blocked (401). v8 chart API has no PE/ROE/D/E data. Use Finnhub for fundamentals. (symbol=${cleanSym}, beta=${beta?.toFixed(2) ?? 'N/A'})`,
    );
  }
}
