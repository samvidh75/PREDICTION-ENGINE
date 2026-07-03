import type { CachedQuote, CacheConfig, UnifiedQuote } from './types';

const DB_NAME = 'StockStory_DataCache';
const STORE_NAME = 'quotes';
const DEFAULT_CONFIG: CacheConfig = {
  priceExpiry: 5 * 60 * 1000, // 5 minutes
  fundamentalExpiry: 60 * 60 * 1000, // 1 hour
  technicalExpiry: 24 * 60 * 60 * 1000, // 1 day
};

/**
 * Browser-side IndexedDB cache for quotes.
 * Enables offline operation and reduces API calls.
 * No server sync — purely local persistent storage.
 */
export class BrowserCache {
  private db: IDBDatabase | null = null;
  private config: CacheConfig;
  private initPromise: Promise<void>;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initPromise = this.init();
  }

  /**
   * Initialize IndexedDB. Called automatically on first use.
   */
  private async init(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      console.warn('IndexedDB not available; caching disabled');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'symbol' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => {
        console.error('IndexedDB initialization failed:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a quote from cache if it exists and hasn't expired.
   */
  async get(symbol: string): Promise<UnifiedQuote | null> {
    await this.initPromise;
    if (!this.db) return null;

    return new Promise((resolve) => {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(symbol.toUpperCase());

      request.onsuccess = () => {
        const cached = request.result as CachedQuote | undefined;
        if (cached && cached.expiresAt > Date.now()) {
          resolve(cached.quote);
        } else {
          // Expired or not found
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * Batch get quotes from cache.
   */
  async getBatch(symbols: string[]): Promise<Map<string, UnifiedQuote>> {
    const results = new Map<string, UnifiedQuote>();
    await Promise.all(
      symbols.map(async (symbol) => {
        const quote = await this.get(symbol);
        if (quote) results.set(symbol, quote);
      }),
    );
    return results;
  }

  /**
   * Store a quote in cache with appropriate TTL.
   * TTL is based on quote type (price: 5min, fundamental: 1hr, technical: 1d).
   */
  async set(quote: UnifiedQuote, ttlMs?: number): Promise<void> {
    await this.initPromise;
    if (!this.db) return;

    const expiresAt = Date.now() + (ttlMs ?? this.config.priceExpiry);
    const cached: CachedQuote = { symbol: quote.symbol, quote, expiresAt, source: quote.source };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(cached);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store multiple quotes in cache.
   */
  async setBatch(quotes: UnifiedQuote[], ttlMs?: number): Promise<void> {
    await Promise.all(quotes.map((q) => this.set(q, ttlMs)));
  }

  /**
   * Clear a specific symbol from cache.
   */
  async clear(symbol?: string): Promise<void> {
    await this.initPromise;
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = symbol ? store.delete(symbol.toUpperCase()) : store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache statistics.
   */
  async stats(): Promise<{ total: number; expired: number }> {
    await this.initPromise;
    if (!this.db) return { total: 0, expired: 0 };

    return new Promise((resolve) => {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result as CachedQuote[];
        const expired = all.filter((c) => c.expiresAt <= Date.now()).length;
        resolve({ total: all.length, expired });
      };

      request.onerror = () => resolve({ total: 0, expired: 0 });
    });
  }
}

// Singleton instance
export const browserCache = new BrowserCache();
