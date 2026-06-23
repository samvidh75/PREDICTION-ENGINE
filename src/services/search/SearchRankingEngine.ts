import { type SearchCandidate } from "../stocks/StockSearchIndex";

const ALIASES: Record<string, string[]> = {
  "reliance": ["RELIANCE", "RIL"],
  "tcs": ["TCS"],
  "infy": ["INFY"],
  "itc": ["ITC"],
  "hdfcbank": ["HDFCBANK"],
  "hdfc": ["HDFCBANK", "HDFC"],
  "icici": ["ICICIBANK"],
  "sbi": ["SBIN"],
  "bajaj": ["BAJFINANCE", "BAJAJFINSV", "BAJAJ-AUTO"],
  "wipro": ["WIPRO"],
  "asianpaints": ["ASIANPAINT"],
  "maruti": ["MARUTI"],
  "tatamotors": ["TATAMOTORS"],
  "tata": ["TATAMOTORS", "TATASTEEL", "TATACONSUM", "TATAPOWER"],
};

export class SearchRankingEngine {
  /**
   * Sorts search results strictly according to Section 139 priority list:
   * 1. Exact normalized symbol match
   * 2. Exact company name match
   * 3. Aliases / known NSE symbols
   * 4. Partial ticker prefix match
   * 5. Partial company name match
   * 6. Fuzzy / health score fallback
   */
  static rank(results: SearchCandidate[], query: string): SearchCandidate[] {
    const q = query.trim().toLowerCase();
    if (!q) return results;

    const aliasSymbols = (ALIASES[q] || []).map((s) => s.toLowerCase());

    return [...results].sort((a, b) => {
      const tickerA = a.ticker.toLowerCase();
      const tickerB = b.ticker.toLowerCase();
      const nameA = a.companyName.toLowerCase();
      const nameB = b.companyName.toLowerCase();

      // Priority 1: Exact normalized symbol match
      if (tickerA === q && tickerB !== q) return -1;
      if (tickerB === q && tickerA !== q) return 1;

      // Priority 2: Exact company name match
      if (nameA === q && nameB !== q) return -1;
      if (nameB === q && nameA !== q) return 1;
      if (nameA === q && nameB === q) return 0;

      // Priority 3: Alias match
      const aliasA = aliasSymbols.includes(tickerA) ? 1 : 0;
      const aliasB = aliasSymbols.includes(tickerB) ? 1 : 0;
      if (aliasA !== aliasB) return aliasB - aliasA;

      // Priority 4: Partial ticker prefix match
      const prefixTickerA = tickerA.startsWith(q) ? 1 : 0;
      const prefixTickerB = tickerB.startsWith(q) ? 1 : 0;
      if (prefixTickerA !== prefixTickerB) return prefixTickerB - prefixTickerA;

      // Priority 5: Partial company name match
      const partialNameA = nameA.includes(q) ? 1 : 0;
      const partialNameB = nameB.includes(q) ? 1 : 0;
      if (partialNameA !== partialNameB) return partialNameB - partialNameA;

      return (b.healthScore ?? 0) - (a.healthScore ?? 0);
    });
  }
}
