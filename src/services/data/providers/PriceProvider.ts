// src/services/data/providers/PriceProvider.ts
import { StockQuote } from '../types';

export interface PriceProvider {
  getQuote(symbol: string): Promise<StockQuote>;
}

export class MockPriceProvider implements PriceProvider {
  public async getQuote(symbol: string): Promise<StockQuote> {
    const sym = symbol.toUpperCase();
    return {
      symbol: sym,
      exchange: sym === 'SUZLON' || sym === 'CHENNPETRO' ? 'BSE' : 'NSE',
      price: sym === 'RELIANCE' ? 2850 : sym === 'HAL' ? 3200 : sym === 'BEL' ? 198 : 150,
      change: 12.5,
      changePercent: 0.85,
      volume: 1500000,
      updatedAt: new Date().toISOString(),
    };
  }
}
