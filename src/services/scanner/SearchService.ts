import { STOCK_UNIVERSE, type StockFundamentals } from './stockUniverse';

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
    const results: SearchResult[] = [];

    for (const stock of STOCK_UNIVERSE) {
      const matchedFields: string[] = [];
      let score = 0;

      if (stock.symbol.toLowerCase() === normalizedQuery) {
        score += 100;
        matchedFields.push('symbol_exact');
      } else if (stock.symbol.toLowerCase().includes(normalizedQuery)) {
        score += 50;
        matchedFields.push('symbol_partial');
      }

      if (stock.name.toLowerCase().includes(normalizedQuery)) {
        score += 40;
        matchedFields.push('name');
      }

      if (stock.sector.toLowerCase().includes(normalizedQuery)) {
        score += 30;
        matchedFields.push('sector');
      }

      const companyNameParts = stock.name.toLowerCase().split(' ');
      for (const part of companyNameParts) {
        if (part.length > 2 && part.includes(normalizedQuery)) {
          score += 20;
          matchedFields.push('company_name');
          break;
        }
      }

      if (score > 0) {
        results.push({
          stock,
          matchedFields,
          rank: score,
        });
      }
    }

    results.sort((a, b) => b.rank - a.rank);

    return results.slice(0, limit);
  }

  public getSuggestions(query: string, limit: number = 10): string[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const suggestions: string[] = [];
    const seen = new Set<string>();

    for (const stock of STOCK_UNIVERSE) {
      if (stock.symbol.toLowerCase().includes(normalizedQuery) && !seen.has(stock.symbol)) {
        suggestions.push(stock.symbol);
        seen.add(stock.symbol);
        if (suggestions.length >= limit) break;
      }
    }

    if (suggestions.length < limit) {
      for (const stock of STOCK_UNIVERSE) {
        if (stock.name.toLowerCase().includes(normalizedQuery) && !seen.has(stock.name)) {
          suggestions.push(stock.name);
          seen.add(stock.name);
          if (suggestions.length >= limit) break;
        }
      }
    }

    return suggestions.slice(0, limit);
  }

  public getStockBySymbol(symbol: string): StockFundamentals | undefined {
    return STOCK_UNIVERSE.find(
      (s) => s.symbol.toUpperCase() === symbol.toUpperCase()
    );
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
    return STOCK_UNIVERSE.length;
 }
}