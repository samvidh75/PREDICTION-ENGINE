import { marketConfigService } from './MarketConfigService';
import { cacheService } from './CacheService';
import { quoteService } from './QuoteService';

export interface DataSourceInfo {
  source: 'live' | 'snapshot' | 'stale';
  timestamp: Date;
  message: string;
  shouldRefresh: boolean;
  nextRefreshTime?: Date;
}

export class DataFreshnessManager {
  static async shouldFetchFreshData(_symbol: string): Promise<DataSourceInfo> {
    const marketStatus = await marketConfigService.getMarketStatus();
    const source = await marketConfigService.getDataSource();

    if (marketStatus.isOpen) {
      return {
        source: 'live',
        timestamp: new Date(),
        message: 'Market open — fetching live data',
        shouldRefresh: true,
        nextRefreshTime: new Date(Date.now() + 30000),
      };
    }

    const snapshot = await marketConfigService.getMarketSnapshot();
    if (snapshot) {
      return {
        source: 'snapshot',
        timestamp: new Date(snapshot.timestamp),
        message: `Snapshot from ${new Date(snapshot.timestamp).toLocaleTimeString('en-IN')} IST`,
        shouldRefresh: false,
      };
    }

    return {
      source: 'stale',
      timestamp: new Date(0),
      message: 'Market closed, no snapshot available',
      shouldRefresh: false,
      nextRefreshTime: marketStatus.nextOpenTime,
    };
  }

  static async getDataWithFreshness(symbol: string): Promise<{
    data: any;
    source: 'live' | 'snapshot' | 'stale';
    freshness: string;
  }> {
    const decision = await this.shouldFetchFreshData(symbol);
    let data: any = null;

    if (decision.shouldRefresh) {
      try {
        data = await quoteService.getQuote(symbol);
        await cacheService.set(`stock:${symbol}`, JSON.stringify(data), 30000);
      } catch (err) {
        console.error(`[DataFreshness] Failed to fetch live data for ${symbol}:`, err);
        const cached = await cacheService.get(`stock:${symbol}`);
        if (cached) data = JSON.parse(cached);
      }
    } else {
      const cached = await cacheService.get(`stock:${symbol}`);
      if (cached) {
        data = JSON.parse(cached);
      } else {
        const snapshot = await marketConfigService.getMarketSnapshot();
        if (snapshot && snapshot.stocks) {
          data = snapshot.stocks[symbol] || null;
        }
      }
    }

    return {
      data,
      source: decision.source,
      freshness: decision.message,
    };
  }
}

export const dataFreshnessManager = DataFreshnessManager;
