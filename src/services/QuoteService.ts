import { IndianAPIProvider, YahooProvider, UpstoxProvider } from '@/providers';
import type { Quote } from '@/types';
import { cacheService } from './CacheService';

const PROVIDERS = [
  new IndianAPIProvider(),
  new UpstoxProvider(),
  new YahooProvider(),
];

export class QuoteService {
  async getQuote(symbol: string): Promise<Quote> {
    for (const provider of PROVIDERS) {
      try {
        const quote = await provider.getQuote(symbol);
        if (quote) {
          return quote;
        }
      } catch {
        continue;
      }
    }
    throw new Error(`Quote unavailable for ${symbol}`);
  }

  async getQuoteWithCache(symbol: string, ttlMs = 30000): Promise<Quote> {
    const cacheKey = `quote:${symbol}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const quote = await this.getQuote(symbol);
    await cacheService.set(cacheKey, JSON.stringify(quote), ttlMs);
    return quote;
  }
}

export const quoteService = new QuoteService();
