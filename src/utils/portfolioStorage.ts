/**
 * Portfolio Storage & Management
 * Persists user holdings with buy price, quantity, and allocation
 */

export interface Holding {
  id: string;
  ticker: string;
  quantity: number;
  buyPrice: number; // PKR
  buyDate: number; // timestamp
  notes?: string;
}

export interface Portfolio {
  userId: string;
  holdings: Holding[];
  createdAt: number;
  updatedAt: number;
  totalInvested: number;
}

const DB_NAME = 'StockExPortfolio';
const DB_VERSION = 1;
const STORE_NAME = 'portfolios';

class PortfolioStorage {
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
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  async getPortfolio(userId: string = 'default'): Promise<Portfolio | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      const request = store.get(userId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async savePortfolio(portfolio: Portfolio): Promise<void> {
    if (!this.db) await this.init();

    // Calculate total invested
    portfolio.totalInvested = portfolio.holdings.reduce((sum, h) => sum + h.quantity * h.buyPrice, 0);
    portfolio.updatedAt = Date.now();

    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      const request = store.put(portfolio);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async addHolding(userId: string, holding: Omit<Holding, 'id'>): Promise<Holding> {
    const portfolio = (await this.getPortfolio(userId)) || {
      userId,
      holdings: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalInvested: 0,
    };

    const newHolding: Holding = {
      ...holding,
      id: `holding-${Date.now()}`,
    };

    portfolio.holdings.push(newHolding);
    await this.savePortfolio(portfolio);

    return newHolding;
  }

  async updateHolding(userId: string, holdingId: string, updates: Partial<Holding>): Promise<void> {
    const portfolio = await this.getPortfolio(userId);
    if (!portfolio) throw new Error('Portfolio not found');

    const holding = portfolio.holdings.find((h) => h.id === holdingId);
    if (!holding) throw new Error('Holding not found');

    Object.assign(holding, updates, { id: holdingId });
    await this.savePortfolio(portfolio);
  }

  async removeHolding(userId: string, holdingId: string): Promise<void> {
    const portfolio = await this.getPortfolio(userId);
    if (!portfolio) throw new Error('Portfolio not found');

    portfolio.holdings = portfolio.holdings.filter((h) => h.id !== holdingId);
    await this.savePortfolio(portfolio);
  }

  /**
   * Get portfolio statistics
   */
  async getPortfolioStats(userId: string = 'default', currentPrices: Record<string, number> = {}): Promise<{
    totalInvested: number;
    currentValue: number;
    totalReturn: number;
    totalReturnPercent: number;
    holdings: Array<{
      ticker: string;
      quantity: number;
      buyPrice: number;
      currentPrice: number;
      investment: number;
      currentValue: number;
      gain: number;
      gainPercent: number;
      allocation: number;
    }>;
    topGainer?: { ticker: string; gainPercent: number };
    topLoser?: { ticker: string; gainPercent: number };
    concentration: { ticker: string; allocation: number }[];
  }> {
    const portfolio = await this.getPortfolio(userId);
    if (!portfolio || portfolio.holdings.length === 0) {
      return {
        totalInvested: 0,
        currentValue: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        holdings: [],
        concentration: [],
      };
    }

    const holdingsWithStats = portfolio.holdings.map((h) => {
      const currentPrice = currentPrices[h.ticker] || h.buyPrice;
      const investment = h.quantity * h.buyPrice;
      const currentValue = h.quantity * currentPrice;
      const gain = currentValue - investment;
      const gainPercent = (gain / investment) * 100;

      return {
        ticker: h.ticker,
        quantity: h.quantity,
        buyPrice: h.buyPrice,
        currentPrice,
        investment,
        currentValue,
        gain,
        gainPercent,
        allocation: 0, // Calculated below
      };
    });

    const totalInvested = portfolio.totalInvested;
    const currentValue = holdingsWithStats.reduce((sum, h) => sum + h.currentValue, 0);
    const totalReturn = currentValue - totalInvested;
    const totalReturnPercent = (totalReturn / totalInvested) * 100;

    // Calculate allocation percentages
    holdingsWithStats.forEach((h) => {
      h.allocation = (h.currentValue / currentValue) * 100;
    });

    // Find top performers
    const topGainer = holdingsWithStats.reduce((prev, curr) => (curr.gainPercent > prev.gainPercent ? curr : prev));
    const topLoser = holdingsWithStats.reduce((prev, curr) => (curr.gainPercent < prev.gainPercent ? curr : prev));

    // Get concentration (holdings > 10% of portfolio)
    const concentration = holdingsWithStats
      .filter((h) => h.allocation > 10)
      .sort((a, b) => b.allocation - a.allocation)
      .map((h) => ({ ticker: h.ticker, allocation: h.allocation }));

    return {
      totalInvested,
      currentValue,
      totalReturn,
      totalReturnPercent,
      holdings: holdingsWithStats,
      topGainer: topGainer.gainPercent !== -Infinity ? topGainer : undefined,
      topLoser: topLoser.gainPercent !== Infinity ? topLoser : undefined,
      concentration,
    };
  }

  /**
   * Clear portfolio
   */
  async clearPortfolio(userId: string = 'default'): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      const request = store.delete(userId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const portfolioStorage = new PortfolioStorage();
