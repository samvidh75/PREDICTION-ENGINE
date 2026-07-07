import { StockRegistry, RegisteredStock } from './StockRegistry';

export class StockSearchEngine {
  /**
   * Performs fuzzy/partial search across Tickers, Names, and Sectors
   * with low latency (<50ms perceived) matching bounds.
   */
  public static search(query: string): RegisteredStock[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return []; // minimum 2 characters threshold

    const universe = StockRegistry.getAllStocks().filter((stock) => {
      if (/^\d{5,6}$/.test(stock.symbol)) return false;
      if (!stock.companyName || stock.companyName.toUpperCase() === stock.symbol.toUpperCase()) return false;
      if (stock.companyName.includes('PSE Listed Security Code')) return false;
      if (!stock.sector || stock.sector === 'Data unavailable') return false;
      return true;
    });
    
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
    }).sort((a, b) => {
      const aSymbol = a.symbol.toLowerCase();
      const bSymbol = b.symbol.toLowerCase();
      if (aSymbol === q && bSymbol !== q) return -1;
      if (bSymbol === q && aSymbol !== q) return 1;
      if (aSymbol.startsWith(q) && !bSymbol.startsWith(q)) return -1;
      if (bSymbol.startsWith(q) && !aSymbol.startsWith(q)) return 1;
      return (b.marketCap?.numeric ?? 0) - (a.marketCap?.numeric ?? 0);
    });
  }
}

export default StockSearchEngine;
