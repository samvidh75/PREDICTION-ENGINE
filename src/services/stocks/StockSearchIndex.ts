import { INDIAN_STOCKS_DATABASE, type IndianStock } from "./StockMetadata";

export type SearchCandidate = {
  ticker: string;
  companyName: string;
  exchange: string;
  sector: string;
  price: number;
  dailyChangePct: number;
  healthScore: number;
};

export class StockSearchEngine {
  /**
   * Performs an ultra-fast search over the registered stock database.
   * Matches company name, ticker, and sector with fuzzy, exact, and prefix support.
   */
  static search(query: string, limit: number = 10): SearchCandidate[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const scored: Array<{ stock: IndianStock; score: number }> = [];

    for (const stock of INDIAN_STOCKS_DATABASE) {
      const ticker = stock.ticker.toLowerCase();
      const name = stock.companyName.toLowerCase();
      const sector = stock.sector.toLowerCase();

      let score = 0;

      if (ticker === q) {
        score = 100; // Exact ticker match
      } else if (ticker.startsWith(q)) {
        score = 80; // Ticker prefix match
      } else if (name.includes(q)) {
        score = 60; // Company name contains match
      } else if (sector.includes(q)) {
        score = 40; // Sector contains match
      } else {
        // Simple token matching
        const qTokens = q.split(/\s+/).filter(Boolean);
        const nameTokens = name.split(/\s+/).filter(Boolean);
        let matches = 0;
        for (const token of qTokens) {
          if (nameTokens.some(nt => nt.startsWith(token) || token.startsWith(nt))) {
            matches++;
          }
        }
        if (matches > 0) {
          score = 10 + matches * 10;
        }
      }

      if (score > 0) {
        scored.push({ stock, score });
      }
    }

    // Sort by match score descending, then by market capitalization descending
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.stock.marketCapCr - a.stock.marketCapCr;
    });

    return scored.slice(0, limit).map(item => ({
      ticker: item.stock.ticker,
      companyName: item.stock.companyName,
      exchange: item.stock.exchange,
      sector: item.stock.sector,
      price: item.stock.price,
      dailyChangePct: item.stock.dailyChangePct,
      healthScore: item.stock.healthScore
    }));
  }
}
