// src/services/providers/YahooFinancePriceProvider.ts
import { PriceProvider } from './PriceProvider';
import { StockQuote } from '../data/types';
import { marketTimestampFromEpoch, normalizeYahooExchange } from './YahooProvider';

/** Resolve a Yahoo ticker without appending duplicate exchange suffixes. */
export function resolveYahooQuoteTicker(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  return /\.(NS|BO)$/.test(normalized) ? normalized : `${normalized}.NS`;
}

function finiteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * YahooFinancePriceProvider fetches quote data from Yahoo Finance v7.
 *
 * This adapter is retained for backward compatibility. The active coordinator
 * uses YahooProvider, but this path must follow the same trust rules so it cannot
 * reintroduce duplicate suffixes, invented PSE labels, or retrieval-time freshness.
 */
export class YahooFinancePriceProvider implements PriceProvider {
  async getQuote(symbol: string): Promise<StockQuote> {
    const ticker = resolveYahooQuoteTicker(symbol);
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YahooFinancePriceProvider failed: ${response.status}`);
    }
    const data = await response.json();
    const result = data?.quoteResponse?.result?.[0];
    if (!result) {
      throw new Error(`No quote data for ${symbol}`);
    }

    const price = finiteNumber(result.regularMarketPrice);
    if (price === undefined || price <= 0) {
      throw new Error(`Invalid quote price for ${symbol}`);
    }

    return {
      symbol: String(result.symbol ?? ticker).replace(/\.(NS)$/i, '').toUpperCase(),
      exchange: normalizeYahooExchange(result.fullExchangeName ?? result.exchange, String(result.symbol ?? ticker)) ?? 'Data unavailable',
      price,
      change: finiteNumber(result.regularMarketChange) ?? 0,
      changePercent: finiteNumber(result.regularMarketChangePercent) ?? 0,
      volume: finiteNumber(result.regularMarketVolume),
      updatedAt: marketTimestampFromEpoch(result.regularMarketTime),
      retrievedAt: new Date().toISOString(),
    };
  }
}
