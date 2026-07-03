import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface CachedQuote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  lastFetched: number;
}

interface MarketDataDB extends DBSchema {
  quotes: {
    key: string;
    value: CachedQuote;
  };
}

const DB_NAME = 'stockstory_p2p_market_data';
const DB_VERSION = 1;
const CACHE_TTL = 3_600_000;

export class IndexedDBCache {
  private db: IDBPDatabase<MarketDataDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    this.db = await openDB<MarketDataDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('quotes')) {
          db.createObjectStore('quotes', { keyPath: 'symbol' });
        }
      },
    });
  }

  async getQuote(symbol: string): Promise<CachedQuote | null> {
    await this.init();
    const quote = await this.db!.get('quotes', symbol.toUpperCase());
    if (quote && Date.now() - quote.lastFetched < CACHE_TTL) {
      return quote;
    }
    return null;
  }

  async setQuote(
    symbol: string, price: number, bid: number, ask: number,
    volume: number, open: number, high: number, low: number, prevClose: number
  ): Promise<void> {
    await this.init();
    await this.db!.put('quotes', {
      symbol: symbol.toUpperCase(), price, bid, ask, volume, open, high, low, prevClose,
      lastFetched: Date.now(),
    });
  }

  async clear(): Promise<void> {
    await this.init();
    await this.db!.clear('quotes');
  }
}
