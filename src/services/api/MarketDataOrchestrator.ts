// src/services/api/MarketDataOrchestrator.ts

import { CompanyTelemetry } from '../../types/stock';
import type { CompanyMetadata, StockQuote } from '../data/types';

function positiveNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatMarketCap(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'Data unavailable';
  if (value >= 1_000_000_000) return `₱${(value / 1_000_000_000).toFixed(2)}B`;
  return `₱${(value / 1_000_000).toFixed(0)}M`;
}

/**
 * Build a truthful company telemetry envelope from the fields actually exposed
 * by the market-data endpoint. Missing PE, 52-week range and health values remain
 * unavailable instead of being synthesized from the current price.
 */
export function buildCompanyTelemetry(quote: StockQuote, metadata: CompanyMetadata): CompanyTelemetry {
  const currentPrice = positiveNumber(quote.price);
  const marketCap = positiveNumber(metadata.marketCap);

  return {
    symbol: quote.symbol,
    marketCap: {
      numeric: marketCap,
      formatted: formatMarketCap(marketCap),
      availability: marketCap === null ? 'unavailable' : 'real',
    },
    peRatio: null,
    fiftyTwoWeekRange: {
      low: null,
      high: null,
      current: currentPrice,
    },
    healthStatus: null,
    lastUpdated: quote.updatedAt ?? null,
    availability: currentPrice === null ? 'unavailable' : 'real',
    source: currentPrice === null ? 'unavailable' : 'provider',
  };
}

class MarketDataOrchestrator {
  async fetchCompanyData(symbol: string): Promise<CompanyTelemetry> {
    const res = await fetch(`/api/market-data/company/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`Market data request failed with HTTP ${res.status}`);
    const { quote, metadata } = await res.json() as { quote: StockQuote; metadata: CompanyMetadata };

    return buildCompanyTelemetry(quote, metadata);
  }
}

export const orchestrator = new MarketDataOrchestrator();
export default orchestrator;
