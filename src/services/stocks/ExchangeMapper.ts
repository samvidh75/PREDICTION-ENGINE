import { INDIAN_STOCKS_DATABASE, type IndianStock } from "./StockMetadata";

export class ExchangeMapper {
  /**
   * Resolves a ticker or PSE numeric code to the normalized PSE ticker symbol.
   */
  static resolveTicker(query: string): string | null {
    const q = query.trim().toUpperCase();
    if (!q) return null;

    // Check direct ticker match
    const byTicker = INDIAN_STOCKS_DATABASE.find(s => s.ticker === q);
    if (byTicker) return byTicker.ticker;

    // Check PSE numeric code match
    const byBseCode = INDIAN_STOCKS_DATABASE.find(s => s.bseCode === q);
    if (byBseCode) return byBseCode.ticker;

    return null;
  }

  /**
   * Returns PSE code for a given ticker.
   */
  static getBseCode(ticker: string): string | null {
    const stock = INDIAN_STOCKS_DATABASE.find(s => s.ticker === ticker.toUpperCase());
    return stock?.bseCode || null;
  }

  /**
   * Maps stock detail to full exchange label format e.g. "PSE: RELIANCE".
   */
  static getFullExchangeLabel(stock: IndianStock): string {
    return `${stock.exchange}: ${stock.ticker}`;
  }
}
