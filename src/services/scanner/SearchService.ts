import type { StockFundamentals } from './stockUniverse';
import { getUniverseCount, searchStocks, getStockResearch } from '../../lib/stockResearch';

export interface SearchResult {
  stock: StockFundamentals;
  matchedFields: string[];
  rank: number;
}

export class SearchService {
  private static instance: SearchService;

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  public search(query: string, limit: number = 50): SearchResult[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    return searchStocks(normalizedQuery, limit).map((stock, index) => ({
      stock: {
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        industry: stock.industry,
        price: stock.price,
        change: stock.change,
        changePercent: stock.changePercent,
        pe: stock.pe ?? 0,
        pb: stock.pb ?? 0,
        roe: stock.roe ?? 0,
        debtToEquity: stock.debtToEquity ?? 0,
        marketCap: stock.marketCap,
        dividendYield: stock.dividendYield ?? 0,
        revenueGrowth: stock.revenueGrowth ?? 0,
        profitGrowth: stock.profitGrowth ?? 0,
        rsi: stock.rsi ?? 50,
      },
      matchedFields: [stock.symbol.toLowerCase() === normalizedQuery ? 'symbol_exact' : 'symbol_partial'],
      rank: limit - index,
    }));
  }

  public getSuggestions(query: string, limit: number = 10): string[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    return searchStocks(query.toLowerCase().trim(), limit).map((stock) => stock.symbol);
  }

  public getStockBySymbol(symbol: string): StockFundamentals | undefined {
    const stock = getStockResearch(symbol);
    if (!stock) return undefined;
    return {
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      industry: stock.industry,
      price: stock.price,
      change: stock.change,
      changePercent: stock.changePercent,
      pe: stock.pe ?? 0,
      pb: stock.pb ?? 0,
      roe: stock.roe ?? 0,
      debtToEquity: stock.debtToEquity ?? 0,
      marketCap: stock.marketCap,
      dividendYield: stock.dividendYield ?? 0,
      revenueGrowth: stock.revenueGrowth ?? 0,
      profitGrowth: stock.profitGrowth ?? 0,
      rsi: stock.rsi ?? 50,
    };
  }

  public getStockByName(name: string): StockFundamentals | undefined {
    return STOCK_UNIVERSE.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
  }

  public getAllSectors(): string[] {
    const sectors = new Set(STOCK_UNIVERSE.map((s) => s.sector));
    return Array.from(sectors).sort();
  }

  public getAllIndustries(): string[] {
    const industries = new Set(STOCK_UNIVERSE.map((s) => s.industry));
    return Array.from(industries).sort();
  }

  public getCount(): number {
    return getUniverseCount();
 }
}
