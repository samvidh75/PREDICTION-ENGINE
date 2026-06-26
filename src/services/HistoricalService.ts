import { YahooProvider, IndianAPIProvider, UpstoxProvider } from '@/providers';
import type { HistoricalPrice } from '@/types';
import { cacheService } from './CacheService';

const PROVIDERS = [
  new YahooProvider(),
  new IndianAPIProvider(),
  new UpstoxProvider(),
];

export class HistoricalService {
  async getHistory(symbol: string, range: string): Promise<HistoricalPrice[]> {
    for (const provider of PROVIDERS) {
      try {
        const history = await provider.getHistory(symbol, range);
        if (history && history.length > 0) {
          return history;
        }
      } catch {
        continue;
      }
    }
    throw new Error(`Historical data unavailable for ${symbol}`);
  }

  async getHistoryWithCache(symbol: string, range: string, ttlMs = 300000): Promise<HistoricalPrice[]> {
    const cacheKey = `history:${symbol}:${range}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const history = await this.getHistory(symbol, range);
    await cacheService.set(cacheKey, JSON.stringify(history), ttlMs);
    return history;
  }
}

export const historicalService = new HistoricalService();
