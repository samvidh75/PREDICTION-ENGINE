import { requestDeduplicator } from './RequestDeduplicator';
import { batchQueue } from './BatchQueue';
import { dataFreshnessManager } from './DataFreshnessManager';
import { cacheService } from './CacheService';
import { quoteService } from './QuoteService';

export class StockDataService {
  async getStockData(symbol: string): Promise<any> {
    return requestDeduplicator.execute(`stock:${symbol}`, async () => {
      const decision = await dataFreshnessManager.shouldFetchFreshData(symbol);

      if (!decision.shouldRefresh) {
        const cached = await cacheService.get(`stock:${symbol}`);
        if (cached) {
          console.log(`[StockData] Using cached data for ${symbol}`);
          return JSON.parse(cached);
        }
      }

      return batchQueue.enqueue(`batch:stock:${symbol}`, async () => {
        const quote = await quoteService.getQuote(symbol);
        await cacheService.set(`stock:${symbol}`, JSON.stringify(quote), 30000);
        return quote;
      });
    });
  }

  async getMultipleStocks(symbols: string[]): Promise<Record<string, any>> {
    const unique = [...new Set(symbols)];
    const results = await Promise.allSettled(unique.map(s => this.getStockData(s)));

    const data: Record<string, any> = {};
    for (let i = 0; i < unique.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled' && r.value) {
        data[unique[i]] = r.value;
      }
    }
    return data;
  }
}

export const stockDataService = new StockDataService();
