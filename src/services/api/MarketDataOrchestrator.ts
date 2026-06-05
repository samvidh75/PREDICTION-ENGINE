// src/services/api/MarketDataOrchestrator.ts

import { CompanyTelemetry } from '../../types/stock';

function formatMarketCap(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'Data unavailable';
  const crore = value / 10_000_000;
  if (crore >= 100_000) return `Rs ${(crore / 100_000).toFixed(2)} L Cr`;
  return `Rs ${Math.round(crore).toLocaleString('en-IN')} Cr`;
}

class MarketDataOrchestrator {
  async fetchCompanyData(symbol: string): Promise<CompanyTelemetry> {
    const res = await fetch(`/api/market-data/company/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`Market data request failed with HTTP ${res.status}`);
    const { quote, metadata } = await res.json();

    return {
      symbol: quote.symbol,
      marketCap: {
        numeric: metadata.marketCap ?? 0,
        formatted: formatMarketCap(metadata.marketCap),
      },
      peRatio: 0,
      fiftyTwoWeekRange: {
        low: quote.price * 0.9,
        high: quote.price * 1.1,
        current: quote.price,
      },
      healthStatus: 'stable' as any,
      lastUpdated: quote.updatedAt,
    };
  }
}

export const orchestrator = new MarketDataOrchestrator();
export default orchestrator;
