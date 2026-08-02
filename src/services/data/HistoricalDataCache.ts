/**
 * Historical Data Cache & Storage Layer
 * Manages OHLC data with localStorage + IndexedDB fallback
 * Reduces API calls and enables offline functionality
 */

import type { OHLC } from '../../components/StockChart';

interface CacheEntry {
  symbol: string;
  data: OHLC[];
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  maxAge: number; // milliseconds
  maxSize: number; // entries per symbol
}

const DEFAULT_CONFIG: CacheConfig = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 365, // 1 year of daily data
};

class HistoricalDataCacheClass {
  private db: IDBDatabase | null = null;
  private dbName = 'PSEStockData';
  private storeName = 'ohlc';
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initDB();
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    if (!('indexedDB' in window)) {
      console.warn('[Cache] IndexedDB not available');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('[Cache] IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[Cache] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'symbol' });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          console.log('[Cache] Object store created');
        }
      };
    });
  }

  /**
   * Set cache key for localStorage
   */
  private getCacheKey(symbol: string): string {
    return `pse_ohlc_${symbol.toUpperCase()}`;
  }

  /**
   * Save OHLC data to cache
   */
  async save(symbol: string, data: OHLC[]): Promise<void> {
    const entry: CacheEntry = {
      symbol: symbol.toUpperCase(),
      data: data.slice(0, this.config.maxSize), // Limit size
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.maxAge,
    };

    // Try IndexedDB first (more reliable for large datasets)
    if (this.db) {
      try {
        await this.saveToIndexedDB(entry);
        return;
      } catch (error) {
        console.warn('[Cache] IndexedDB save failed, falling back to localStorage:', error);
      }
    }

    // Fall back to localStorage
    try {
      this.saveToLocalStorage(entry);
    } catch (error) {
      console.error('[Cache] localStorage save failed:', error);
    }
  }

  /**
   * Retrieve OHLC data from cache
   */
  async get(symbol: string): Promise<OHLC[] | null> {
    symbol = symbol.toUpperCase();

    // Try IndexedDB first
    if (this.db) {
      try {
        const entry = await this.getFromIndexedDB(symbol);
        if (entry && this.isValid(entry)) {
          return entry.data;
        }
      } catch (error) {
        console.warn('[Cache] IndexedDB retrieval failed:', error);
      }
    }

    // Fall back to localStorage
    try {
      const entry = this.getFromLocalStorage(symbol);
      if (entry && this.isValid(entry)) {
        return entry.data;
      }
    } catch (error) {
      console.warn('[Cache] localStorage retrieval failed:', error);
    }

    return null;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() < entry.expiresAt;
  }

  /**
   * Save to IndexedDB
   */
  private saveToIndexedDB(entry: CacheEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get from IndexedDB
   */
  private getFromIndexedDB(symbol: string): Promise<CacheEntry | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(symbol);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Save to localStorage
   */
  private saveToLocalStorage(entry: CacheEntry): void {
    const key = this.getCacheKey(entry.symbol);
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[Cache] localStorage quota exceeded, cleaning old entries');
        this.cleanupOldEntries();
        try {
          localStorage.setItem(key, JSON.stringify(entry));
        } catch (retryError) {
          console.error('[Cache] Failed to save after cleanup:', retryError);
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Get from localStorage
   */
  private getFromLocalStorage(symbol: string): CacheEntry | null {
    const key = this.getCacheKey(symbol);
    const data = localStorage.getItem(key);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('[Cache] Failed to parse cached data:', error);
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('pse_ohlc_')) continue;

      try {
        const entry = JSON.parse(localStorage.getItem(key) || '{}');
        if (entry.expiresAt && now > entry.expiresAt) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Clear specific symbol from cache
   */
  async clear(symbol: string): Promise<void> {
    symbol = symbol.toUpperCase();

    // Clear from IndexedDB
    if (this.db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = this.db!.transaction(this.storeName, 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const request = store.delete(symbol);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      } catch (error) {
        console.warn('[Cache] IndexedDB delete failed:', error);
      }
    }

    // Clear from localStorage
    const key = this.getCacheKey(symbol);
    localStorage.removeItem(key);
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    // Clear IndexedDB
    if (this.db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = this.db!.transaction(this.storeName, 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const request = store.clear();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      } catch (error) {
        console.warn('[Cache] IndexedDB clear failed:', error);
      }
    }

    // Clear localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('pse_ohlc_')) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Get cache stats
   */
  getStats(): { itemsInCache: number; estimatedSize: string } {
    let count = 0;
    let bytes = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pse_ohlc_')) {
        count++;
        const value = localStorage.getItem(key) || '';
        bytes += value.length;
      }
    }

    return {
      itemsInCache: count,
      estimatedSize: `${(bytes / 1024).toFixed(2)} KB`,
    };
  }
}

export const historicalDataCache = new HistoricalDataCacheClass();
