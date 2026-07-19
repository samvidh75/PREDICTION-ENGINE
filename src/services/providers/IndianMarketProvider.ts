// src/services/providers/IndianMarketProvider.ts
// Production Philippine Market Provider — real HTTP requests via IndianAPI.in
// Supports PSE, PSE, quotes, metadata, and close-only historical datasets.

import { PriceProvider } from './PriceProvider';
import { MetadataProvider } from './MetadataProvider';
import { HistoricalProvider } from './HistoricalProvider';
import { StockQuote, CompanyMetadata, HistoricalPoint } from '../data/types';
import { getSharedProviderRequestBroker } from './broker/createProviderRequestBroker';
import { getCurrentIngestionRunId } from '../acquisition/IngestionRunContext';

const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_POLICIES = {
  quote: { ttlMs: 30_000, staleWindowMs: 30_000, negativeTtlMs: 30_000 },
  metadata: { ttlMs: 300_000, staleWindowMs: 300_000, negativeTtlMs: 60_000 },
  history: { ttlMs: 600_000, staleWindowMs: 600_000, negativeTtlMs: 60_000 },
} as const;

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

type IndianExchange = 'NSE' | 'BSE';

function positiveNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function explicitIndianExchange(symbol: string): IndianExchange | undefined {
  const normalized = symbol.trim().toUpperCase();
  if (/\.NS$/.test(normalized)) return 'NSE';
  if (/\.BO$/.test(normalized)) return 'BSE';
  return undefined;
}

/**
 * Resolve venue only from explicit suffix evidence or an unambiguous one-venue
 * payload. A bare symbol with both NSE and BSE prices intentionally stays unknown.
 */
export function inferIndianApiExchange(symbol: string, currentPrice?: Record<string, unknown>): IndianExchange | undefined {
  const explicit = explicitIndianExchange(symbol);
  if (explicit) return explicit;

  const nse = positiveNumber(currentPrice?.NSE);
  const bse = positiveNumber(currentPrice?.BSE);
  if (nse !== undefined && bse === undefined) return 'NSE';
  if (bse !== undefined && nse === undefined) return 'BSE';
  return undefined;
}

/** Convert IndianAPI source date/time into ISO without substituting retrieval time. */
export function sourceTimestampFromIndianApi(date: unknown, time: unknown): string | undefined {
  if (typeof date !== 'string' || typeof time !== 'string' || !date.trim() || !time.trim()) return undefined;
  const parsed = new Date(`${date.trim()} ${time.trim()}`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export class IndianMarketProvider implements PriceProvider, MetadataProvider, HistoricalProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey
      || (typeof process !== 'undefined' && process.env?.INDIANAPI_KEY)
      || '';
    this.apiKey = key;
  }

  private cleanSymbol(symbol: string): string {
    return symbol.toUpperCase().replace(/\.(NS|BO|PSE|PSE)$/i, '');
  }

  private async fetchJson(operation: 'quote' | 'metadata' | 'history', symbol: string, params: Record<string, unknown>, url: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('PhilippineAPI key not set (INDIANAPI_KEY)');
    }

    const clean = this.cleanSymbol(symbol);
    const result = await (await getSharedProviderRequestBroker()).execute('indianapi', operation, clean, params, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const resp = await fetch(url, {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        return {
          data: await this.readJsonSafely(resp),
          status: resp.status,
          headers: headersToRecord(resp.headers),
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
      throw new Error(`IndianAPI ${operation} unavailable for ${clean}: ${result.statusClass}`);
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
    const clean = this.cleanSymbol(symbol);
    const url = `https://stock.indianapi.in/stock?name=${encodeURIComponent(clean)}`;
    const data = await this.fetchJson('quote', symbol, { name: clean }, url);

    const s = data.stockDetailsReusableData || {};
    const currentPriceObj = data.currentPrice || {};
    const exchange = inferIndianApiExchange(symbol, currentPriceObj);
    const nsePrice = positiveNumber(currentPriceObj.NSE);
    const bsePrice = positiveNumber(currentPriceObj.BSE);
    const neutralPrice = positiveNumber(s.price);

    const price = exchange === 'NSE'
      ? nsePrice ?? neutralPrice
      : exchange === 'BSE'
        ? bsePrice ?? neutralPrice
        : neutralPrice;

    if (price === undefined) {
      throw new Error(`IndianAPI: quote price unavailable or venue-ambiguous for ${symbol}`);
    }

    const changePercent = finiteNumber(s.percentChange) ?? finiteNumber(data.percentChange) ?? 0;
    const prevClose = positiveNumber(s.close) ?? 0;
    const change = prevClose ? price - prevClose : 0;

    let volume: number | undefined;
    if (data.keyMetrics?.priceandVolume) {
      const item = data.keyMetrics.priceandVolume.find((x: any) => x.key === 'avgTradingVolumeLast10Days');
      if (item && item.value) {
        volume = Math.round((positiveNumber(item.value) ?? 0) * 100_000); // convert Lakhs to units
      }
    }

    return {
      symbol: clean,
      exchange: exchange ?? 'Data unavailable',
      price,
      change,
      changePercent,
      volume,
      updatedAt: sourceTimestampFromIndianApi(s.date, s.time),
      retrievedAt: new Date().toISOString(),
    };
  }

  // ── Metadata ──────────────────────────────────────────────
  async getMetadata(symbol: string): Promise<CompanyMetadata> {
    const clean = this.cleanSymbol(symbol);
    const url = `https://stock.indianapi.in/stock?name=${encodeURIComponent(clean)}`;
    const data = await this.fetchJson('metadata', symbol, { name: clean }, url);

    const s = data.stockDetailsReusableData || {};
    const exchange = inferIndianApiExchange(symbol, data.currentPrice || {});

    // Convert Market Cap from Crore INR to actual INR
    const marketCapCrore = positiveNumber(s.marketCap);
    const marketCap = marketCapCrore === undefined ? undefined : marketCapCrore * 10_000_000;

    return {
      symbol: clean,
      companyName: data.companyName || clean,
      sector: data.industry || '',
      industry: data.industry || '',
      exchange,
      marketCap,
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

    // Map ranges
    let period = '1yr';
    const normalizedRange = range.toUpperCase();
    if (normalizedRange === '1D' || normalizedRange === '5D' || normalizedRange === '1M') period = '1m';
    else if (normalizedRange === '3M' || normalizedRange === '6M') period = '6m';
    else if (normalizedRange === '3Y') period = '3yr';
    else if (normalizedRange === '5Y') period = '5yr';
    else if (normalizedRange === '10Y') period = '10yr';
    else if (normalizedRange === 'MAX') period = 'max';

    const url = `https://stock.indianapi.in/historical_data?stock_name=${encodeURIComponent(clean)}&period=${period}&filter=price`;
    const data = await this.fetchJson('history', symbol, { stock_name: clean, period, filter: 'price' }, url);
    const priceDataset = data.datasets?.find((dataset: any) => dataset.metric === 'Price');

    if (!priceDataset?.values?.length) return [];

    return priceDataset.values
      .filter((v: any) => v && typeof v[0] === 'string' && typeof v[1] === 'number')
      .map((v: any) => ({
        date: v[0].split('T')[0] || v[0],
        close: v[1],
        source: 'indianapi',
      }))
      .filter((p: HistoricalPoint) => p.date && p.close > 0);
  }
}
