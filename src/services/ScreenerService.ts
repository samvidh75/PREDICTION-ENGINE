import { ScreenerProvider, IndianAPIProvider } from '@/providers';
import type { Fundamentals } from '@/types';
import { cacheService } from './CacheService';

const FUNDAMENTALS_PROVIDERS = [
  new ScreenerProvider(),
  new IndianAPIProvider(),
];

export class ScreenerService {
  async getFundamentals(symbol: string): Promise<Fundamentals | null> {
    const cached = await this.getCached(symbol);
    if (cached) return cached;

    for (const provider of FUNDAMENTALS_PROVIDERS) {
      try {
        const data = await provider.getFundamentals(symbol);
        if (data) {
          await this.cacheData(symbol, data);
          return data;
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  private async getCached(symbol: string): Promise<Fundamentals | null> {
    const raw = await cacheService.get(`fundamentals:${symbol}`);
    if (!raw) return null;
    const data: Fundamentals = JSON.parse(raw);
    const staleMs = 12 * 60 * 60 * 1000;
    if (Date.now() - new Date(data.fetchedAt).getTime() > staleMs) return null;
    return data;
  }

  private async cacheData(symbol: string, data: Fundamentals): Promise<void> {
    await cacheService.set(`fundamentals:${symbol}`, JSON.stringify(data), 24 * 60 * 60 * 1000);
  }

  async getFundamentalsBulk(symbols: string[]): Promise<Map<string, Fundamentals | null>> {
    const results = new Map<string, Fundamentals | null>();
    for (const symbol of symbols) {
      const data = await this.getFundamentals(symbol);
      results.set(symbol, data);
    }
    return results;
  }
}

export const screenerService = new ScreenerService();
