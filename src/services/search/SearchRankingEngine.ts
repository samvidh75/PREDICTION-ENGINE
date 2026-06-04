import { type SearchCandidate } from "../stocks/StockSearchIndex";

export class SearchRankingEngine {
  /**
   * Sorts search results strictly according to Section 139 priority list:
   * 1. Exact ticker
   * 2. Exact company name
   * 3. Partial ticker prefix
   * 4. Partial company name
   * 5. Fuzzy match
   */
  static rank(results: SearchCandidate[], query: string): SearchCandidate[] {
    const q = query.trim().toLowerCase();
    if (!q) return results;

    return [...results].sort((a, b) => {
      const tickerA = a.ticker.toLowerCase();
      const tickerB = b.ticker.toLowerCase();
      const nameA = a.companyName.toLowerCase();
      const nameB = b.companyName.toLowerCase();

      // Priority 1: Exact ticker match
      const exactTickerA = tickerA === q ? 1 : 0;
      const exactTickerB = tickerB === q ? 1 : 0;
      if (exactTickerA !== exactTickerB) return exactTickerB - exactTickerA;

      // Priority 2: Exact company name match
      const exactNameA = nameA === q ? 1 : 0;
      const exactNameB = nameB === q ? 1 : 0;
      if (exactNameA !== exactNameB) return exactNameB - exactNameA;

      // Priority 3: Partial ticker prefix match
      const prefixTickerA = tickerA.startsWith(q) ? 1 : 0;
      const prefixTickerB = tickerB.startsWith(q) ? 1 : 0;
      if (prefixTickerA !== prefixTickerB) return prefixTickerB - prefixTickerA;

      // Priority 4: Partial company name match
      const partialNameA = nameA.includes(q) ? 1 : 0;
      const partialNameB = nameB.includes(q) ? 1 : 0;
      if (partialNameA !== partialNameB) return partialNameB - partialNameA;

      return b.healthScore - a.healthScore; // Fallback sorting by health score
    });
  }
}
