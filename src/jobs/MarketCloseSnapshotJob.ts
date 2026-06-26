import { marketConfigService } from '../services/MarketConfigService';
import { quoteService } from '../services/QuoteService';
import { stockUniverseService } from '../services/StockUniverseService';
import { query } from '../db/index';

interface SnapshotJobResult {
  success: boolean;
  timestamp: string;
  stocksCount: number;
  error?: string;
}

export class MarketCloseSnapshotJob {
  static async execute(): Promise<SnapshotJobResult> {
    const startTime = Date.now();
    console.info('[SnapshotJob] Starting market close snapshot...');

    try {
      const status = await marketConfigService.getMarketStatus();
      if (status.dayStatus !== 'closed' && status.dayStatus !== 'weekend' && status.dayStatus !== 'holiday') {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          stocksCount: 0,
          error: `Market is currently ${status.dayStatus} — snapshots only saved after close`,
        };
      }

      const universe = await stockUniverseService.getTopStocks('NSE', 2000);
      const symbols = universe.map(s => s.symbol);
      console.info(`[SnapshotJob] Snapshotting ${symbols.length} stocks from universe`);

      const snapshotData: Record<string, any> = {};
      const batchSize = 10;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (symbol) => {
            const quote = await quoteService.getQuote(symbol);
            return { symbol, quote };
          }),
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            snapshotData[result.value.symbol] = result.value.quote;
            successCount++;
          } else {
            failCount++;
          }
        }

        console.info(`[SnapshotJob] Progress: ${Math.min(i + batchSize, symbols.length)}/${symbols.length}`);
      }

      const metadata = {
        totalStocks: Object.keys(snapshotData).length,
        totalFetched: successCount,
        totalFailed: failCount,
        duration: Date.now() - startTime,
      };

      const saved = await marketConfigService.saveMarketSnapshot(snapshotData, metadata);

      if (!saved) {
        throw new Error('Failed to save snapshot to database');
      }

      const duration = Date.now() - startTime;
      console.info(`[SnapshotJob] Completed in ${duration}ms. Saved ${successCount} stocks (${failCount} failed).`);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        stocksCount: successCount,
      };
    } catch (error) {
      console.error('[SnapshotJob] Failed:', error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        stocksCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async getLatestSnapshotInfo(): Promise<{
    exists: boolean;
    date?: string;
    stockCount?: number;
    age?: string;
  }> {
    try {
      const res = await query(
        'SELECT date, timestamp, metadata FROM market_snapshots ORDER BY timestamp DESC LIMIT 1',
      );
      if (res.rows.length === 0) return { exists: false };

      const row = res.rows[0] as any;
      const age = Date.now() - new Date(row.timestamp).getTime();
      const hours = Math.floor(age / 3600000);
      const minutes = Math.floor((age % 3600000) / 60000);

      return {
        exists: true,
        date: row.date,
        stockCount: row.metadata?.totalStocks || 0,
        age: `${hours}h ${minutes}m ago`,
      };
    } catch {
      return { exists: false };
    }
  }
}
