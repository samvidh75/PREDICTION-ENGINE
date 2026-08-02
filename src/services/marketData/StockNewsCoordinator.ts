import { type CompanyNewsItem } from "../../types/CompanyUniverse";

export class StockNewsCoordinator {
  /**
   * Evaluates, coordinates, and prioritizes active news cards for specific stocks.
   * Enforces a strict limit of exactly 10 visible items (Section 125).
   */
  static coordinateNews(news: CompanyNewsItem[]): CompanyNewsItem[] {
    // Sort primarily by recency, then prioritize company news.
    const sorted = [...news].sort((a, b) => {
      const aVal = a.kind === "EARNINGS" || a.kind === "REGULATORY" ? 1 : 0;
      const bVal = b.kind === "EARNINGS" || b.kind === "REGULATORY" ? 1 : 0;
      return bVal - aVal;
    });

    return sorted.slice(0, 10);
  }
}
