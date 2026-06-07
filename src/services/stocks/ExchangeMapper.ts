import { INDIAN_STOCKS_DATABASE, type IndianStock } from "./StockMetadata";

export class ExchangeMapper {
  /**
   * Resolves a ticker or BSE numeric code to the normalized NSE ticker symbol.
   */
  static resolveTicker(query: string): string | null {
    const q = query.trim().toUpperCase();
    if (!q) return null;

    // Check direct ticker match
    const byTicker = INDIAN_STOCKS_DATABASE.find(s => s.ticker === q);
    if (byTicker) return byTicker.ticker;

    // Check BSE numeric code match
    const byBseCode = INDIAN_STOCKS_DATABASE.find(s => s.bseCode === q);
    if (byBseCode) return byBseCode.ticker;

    return null;
  }

  /**
   * Returns BSE code for a given ticker.
   */
  static getBseCode(ticker: string): string | null {
    const stock = INDIAN_STOCKS_DATABASE.find(s => s.ticker === ticker.toUpperCase());
    return stock?.bseCode || null;
  }

  /**
   * Maps stock detail to full exchange label format e.g. "NSE: RELIANCE".
   */
  static getFullExchangeLabel(stock: IndianStock): string {
    return `${stock.exchange}: ${stock.ticker}`;
  }
}
