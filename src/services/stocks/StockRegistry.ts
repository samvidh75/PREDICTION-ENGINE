import { CompanyTelemetry } from '../../types/stock';

export interface RegisteredStock extends CompanyTelemetry {
  companyName: string;
  exchange: 'NSE' | 'BSE' | 'SME';
  sector: string;
}

import { generate500Stocks } from "./generate500Stocks";

// ─── Master Stock Registry Dataset (NSE, BSE, SME Segment Boundaries) ───────────────
const MASTER_STOCK_REGISTRY: Record<string, RegisteredStock> = {};

const dynamicList = generate500Stocks();
for (const stock of dynamicList) {
  MASTER_STOCK_REGISTRY[stock.symbol] = {
    symbol: stock.symbol,
    companyName: stock.name,
    exchange: stock.exchange as any,
    sector: stock.sector,
    marketCap: { numeric: 0, formatted: "Data unavailable" },
    peRatio: 0,
    fiftyTwoWeekRange: { low: 0, high: 0, current: 0 },
    healthStatus: "stable",
    lastUpdated: new Date().toISOString()
  };
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
