/**
 * React hook for cached market data
 * - Fetches from FastAPI backend (already cached)
 * - Caches in IndexedDB for offline access
 * - Serves from IndexedDB if available
 */

import { useEffect, useState } from "react";

export interface MarketData {
  symbol: string;
  quote: {
    price: number;
    bid: number;
    ask: number;
    volume: number;
    open: number;
    high: number;
    low: number;
    prev_close: number;
    timestamp: string;
  } | null;
  technical_indicators: {
    rsi_14: number | null;
    ema_50: number | null;
    ema_200: number | null;
    sma_50: number | null;
    sma_200: number | null;
    macd: number | null;
    macd_signal: number | null;
    macd_histogram: number | null;
    bb_upper: number | null;
    bb_middle: number | null;
    bb_lower: number | null;
    atr_14: number | null;
  };
  ema_crosses: Array<{
    type: "GOLDEN_CROSS" | "DEATH_CROSS";
    date: string;
  }>;
  options_greeks: {
    call: { delta: number; gamma: number; vega: number; theta: number; price: number | null };
    put: { delta: number; gamma: number; vega: number; theta: number; price: number | null };
  };
}

class MarketDataIndexedDB {
  async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("stockstory_market_data", 1);
      req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("market_data")) {
          db.createObjectStore("market_data", { keyPath: "symbol" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async get(symbol: string): Promise<MarketData | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("market_data", "readonly");
      const store = tx.objectStore("market_data");
      const req = store.get(symbol.toUpperCase());
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async set(data: MarketData): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("market_data", "readwrite");
      const store = tx.objectStore("market_data");
      const req = store.put(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export function useMarketData(symbol: string) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      const idb = new MarketDataIndexedDB();

      try {
        const cached = await idb.get(symbol);
        if (cached && !cancelled) {
          setData(cached);
          setLoading(false);
        }
      } catch {
        /* IndexedDB read failed, fall through to network */
      }

      try {
        const res = await fetch(`/api/market-data/quote/${symbol}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const newData: MarketData = await res.json();
        if (!cancelled) {
          setData(newData);
          setLoading(false);
          try { await idb.set(newData); } catch {
            /* IndexedDB write failed, data still served from memory */
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (!data) setError(err as Error);
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [symbol]);

  return { data, loading, error };
}
