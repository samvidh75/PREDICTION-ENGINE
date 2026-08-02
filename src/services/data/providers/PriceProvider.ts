// src/services/data/providers/PriceProvider.ts
import { StockQuote } from '../types';

export interface PriceProvider {
  getQuote(symbol: string): Promise<StockQuote>;
}
