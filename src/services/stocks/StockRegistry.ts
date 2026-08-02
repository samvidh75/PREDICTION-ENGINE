import { CompanyTelemetry } from '../../types/stock';
import MasterCompanyRegistry from '../data/MasterCompanyRegistry';

export interface RegisteredStock extends CompanyTelemetry {
  companyName: string;
  exchange: 'PSE' | 'SME';
  sector: string;
}

import { generate500Stocks } from "./generate500Stocks";

// ─── Master Stock Registry Dataset (PSE, SME Segment Boundaries) ───────────────
const MASTER_STOCK_REGISTRY: Record<string, RegisteredStock> = {};
const registry = MasterCompanyRegistry.getInstance();

const dynamicList = generate500Stocks();
for (const stock of dynamicList) {
  const registryEntry = registry.lookup(stock.symbol);
  const marketCap = registryEntry?.marketCap ?? undefined;
  MASTER_STOCK_REGISTRY[stock.symbol] = {
    symbol: stock.symbol,
    companyName: registryEntry?.companyName || stock.name,
    exchange: (registryEntry?.exchange || stock.exchange) as any,
    sector: registryEntry?.sector || stock.sector,
    marketCap: {
      numeric: marketCap ?? null,
      formatted: marketCap ? formatMarketCap(marketCap) : "Data unavailable",
      availability: marketCap ? 'real' as const : 'unavailable' as const,
    },
    peRatio: null,
    fiftyTwoWeekRange: { low: null, high: null, current: null },
    healthStatus: "stable",
    lastUpdated: null,
    availability: 'registry-only' as const,
    source: 'registry-only' as const,
  };
}

function formatMarketCap(value: number): string {
  if (value >= 1_000_000_000) {
    return `₱${(value / 1_000_000_000).toFixed(2)}B`;
  }
  return `₱${(value / 1_000_000).toFixed(0)}M`;
}

export class StockRegistry {
  /**
   * Resolve stock metadata globally from local registry repository
   */
  public static getStock(symbol: string): RegisteredStock | null {
    let k = symbol.trim().toUpperCase();
    if (k.includes(".")) {
      k = k.split(".")[0];
    }
    const found = MASTER_STOCK_REGISTRY[k];
    if (found) return found;

    // Return null for unknown symbols instead of providing fallback data
    return null;
  }

  /**
   * Retrieves all registered entities in list format
   */
  public static getAllStocks(): RegisteredStock[] {
    return Object.values(MASTER_STOCK_REGISTRY);
  }
}

export default StockRegistry;
