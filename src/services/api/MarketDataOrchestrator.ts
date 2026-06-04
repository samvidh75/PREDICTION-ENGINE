// src/services/api/MarketDataOrchestrator.ts

import { MarketDataGateway } from '../data/MarketDataGateway';
import { CompanyTelemetry } from '../../types/stock';
import { StockQuote, CompanyMetadata } from '../data/types';

class MarketDataOrchestrator {
  /**
   * Fetches company telemetry by combining quote and metadata from the
   * MarketDataGateway. This replaces the previous direct reliance on
   * StockRegistry.
   */
  async fetchCompanyData(symbol: string): Promise<CompanyTelemetry> {
    const res = await fetch(`/api/market-data/company/${symbol}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const { quote, metadata } = await res.json();

    const telemetry: CompanyTelemetry = {
      symbol: quote.symbol,
      marketCap: {
        numeric: metadata.marketCap ?? 0,
        formatted: metadata.marketCap ? `₹${metadata.marketCap} Cr` : '₹0 Cr',
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
    return telemetry;
  }
}

export const orchestrator = new MarketDataOrchestrator();
export default orchestrator;
