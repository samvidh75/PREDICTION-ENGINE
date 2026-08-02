/**
 * Portfolio Performance History
 * Tracks daily snapshots for historical analysis
 * - Daily returns calculation
 * - Performance attribution
 * - Time-series data for charts
 */

export interface PortfolioSnapshot {
  date: number; // timestamp
  totalValue: number;
  totalInvested: number;
  totalReturn: number;
  totalReturnPercent: number;
  holdings: Array<{
    ticker: string;
    value: number;
    quantity: number;
    currentPrice: number;
  }>;
}

export interface PerformanceHistory {
  snapshots: PortfolioSnapshot[];
  startDate: number;
  currentDate: number;
  bestDay?: { date: number; returnPercent: number };
  worstDay?: { date: number; returnPercent: number };
  averageDailyReturn: number;
  volatility: number; // standard deviation
  sharpeRatio: number; // return / volatility
}

const DB_NAME = 'StockExPerformanceHistory';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

class PortfolioPerformanceHistory {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }
      };
    });
  }

  /**
   * Save daily snapshot
   */
  async saveSnapshot(userId: string, snapshot: PortfolioSnapshot): Promise<void> {
    if (!this.db) await this.init();

    const record = {
      id: `${userId}-${snapshot.date}`,
      userId,
      ...snapshot,
    };

    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      const request = store.put(record);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get history for date range
   */
  async getHistory(userId: string, startDate?: number, endDate?: number): Promise<PortfolioSnapshot[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      const index = store.index('userId');
      const range = IDBKeyRange.only(userId);
      const request = index.getAll(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let results = request.result;

        // Filter by date range if provided
        if (startDate || endDate) {
          results = results.filter((s) => {
            if (startDate && s.date < startDate) return false;
            if (endDate && s.date > endDate) return false;
            return true;
          });
        }

        // Sort by date ascending
        results.sort((a, b) => a.date - b.date);
        resolve(results);
      };
    });
  }

  /**
   * Calculate performance metrics
   */
  calculateMetrics(snapshots: PortfolioSnapshot[]): Partial<PerformanceHistory> {
    if (snapshots.length === 0) {
      return {
        averageDailyReturn: 0,
        volatility: 0,
        sharpeRatio: 0,
      };
    }

    // Calculate daily returns
    const dailyReturns: number[] = [];
    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1];
      const curr = snapshots[i];
      const dailyReturn = (curr.totalReturnPercent - prev.totalReturnPercent) / 100;
      dailyReturns.push(dailyReturn);
    }

    // Average daily return
    const avgDailyReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;

    // Volatility (standard deviation)
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgDailyReturn, 2), 0) / dailyReturns.length;
    const volatility = Math.sqrt(variance);

    // Sharpe Ratio (assuming 0% risk-free rate)
    const sharpeRatio = volatility > 0 ? avgDailyReturn / volatility : 0;

    // Best and worst days
    let bestDay: { date: number; returnPercent: number } | undefined;
    let worstDay: { date: number; returnPercent: number } | undefined;

    if (dailyReturns.length > 0) {
      const maxReturnIdx = dailyReturns.indexOf(Math.max(...dailyReturns));
      const minReturnIdx = dailyReturns.indexOf(Math.min(...dailyReturns));

      bestDay = {
        date: snapshots[maxReturnIdx + 1].date,
        returnPercent: dailyReturns[maxReturnIdx] * 100,
      };

      worstDay = {
        date: snapshots[minReturnIdx + 1].date,
        returnPercent: dailyReturns[minReturnIdx] * 100,
      };
    }

    return {
      averageDailyReturn: avgDailyReturn * 100,
      volatility: volatility * 100,
      sharpeRatio,
      bestDay,
      worstDay,
    };
  }

  /**
   * Get performance history with metrics
   */
  async getPerformanceHistory(userId: string, days: number = 30): Promise<PerformanceHistory> {
    const endDate = Date.now();
    const startDate = endDate - days * 24 * 60 * 60 * 1000;

    const snapshots = await this.getHistory(userId, startDate, endDate);
    const metrics = this.calculateMetrics(snapshots);

    return {
      snapshots,
      startDate,
      currentDate: endDate,
      ...metrics,
    } as PerformanceHistory;
  }

  /**
   * Clear all history
   */
  async clearHistory(userId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      const index = store.index('userId');
      const range = IDBKeyRange.only(userId);
      const request = index.openCursor(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}

export const portfolioPerformanceHistory = new PortfolioPerformanceHistory();
