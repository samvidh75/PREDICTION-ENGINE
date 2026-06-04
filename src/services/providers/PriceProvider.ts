// src/services/providers/PriceProvider.ts
export interface PriceProvider {
  getQuote(symbol: string): Promise<import('../data/types').StockQuote>;
}
