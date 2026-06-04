import { StockRegistry, RegisteredStock } from './StockRegistry';

export class StockSearchEngine {
  /**
   * Performs fuzzy/partial search across Tickers, Names, and Sectors
   * with low latency (<50ms perceived) matching bounds.
   */
  public static search(query: string): RegisteredStock[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return []; // minimum 2 characters threshold

    const universe = StockRegistry.getAllStocks();
    
    return universe.filter(stock => {
      const symbol = stock.symbol.toLowerCase();
      const name = stock.companyName.toLowerCase();
      const sector = stock.sector.toLowerCase();

      // Direct Matches
      if (symbol === q || name === q) return true;

      // Partial Matches
      if (symbol.includes(q) || name.includes(q) || sector.includes(q)) return true;

      // Fuzzy boundary checking (starts with query)
      if (symbol.startsWith(q) || name.startsWith(q)) return true;

      return false;
    });
  }
}

export default StockSearchEngine;
