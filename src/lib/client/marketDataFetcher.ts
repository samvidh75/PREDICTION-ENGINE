import { IndexedDBCache, CachedQuote } from './indexedDBCache';

export type { CachedQuote };

export interface FetchResult {
  price: number;
  bid: number;
  ask: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
}

interface QueueItem {
  symbol: string;
  resolve: (data: FetchResult) => void;
  reject: (err: Error) => void;
}

const RATE_LIMIT_MS = 3000;

export class ClientMarketDataFetcher {
  private cache = new IndexedDBCache();
  private requestQueue: QueueItem[] = [];
  private isProcessing = false;

  async fetch(symbol: string): Promise<FetchResult> {
    const cached = await this.cache.getQuote(symbol);
    if (cached) {
      return cached;
    }
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ symbol, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    this.isProcessing = true;

    const processNext = async () => {
      if (this.requestQueue.length === 0) {
        this.isProcessing = false;
        return;
      }

      const { symbol, resolve, reject } = this.requestQueue.shift()!;

      try {
        const data = await this.tryFetch(symbol);
        if (data) {
          await this.cache.setQuote(
            symbol, data.price, data.bid, data.ask,
            data.volume, data.open, data.high, data.low, data.prevClose
          );
          resolve(data);
        } else {
          reject(new Error(`Failed to fetch ${symbol}`));
        }
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }

      if (this.requestQueue.length > 0) {
        setTimeout(processNext, RATE_LIMIT_MS);
      } else {
        this.isProcessing = false;
      }
    };

    processNext();
  }

  private async tryFetch(symbol: string): Promise<FetchResult | null> {
    const fetchers = [
      this.fetchYFinance.bind(this),
      this.fetchIndianAPI.bind(this),
      this.fetchGroww.bind(this),
    ];
    for (const fetcher of fetchers) {
      try {
        const result = await fetcher(symbol);
        if (result) return result;
      } catch {
        /* try next provider */
      }
    }
    return null;
  }

  private async fetchYFinance(symbol: string): Promise<FetchResult | null> {
    try {
      const ticker = `${symbol}.NS`;
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return null;
      const body: any = await res.json();
      const chart = body.chart?.result?.[0];
      if (!chart) return null;
      const meta = chart.meta;
      const quote = chart.indicators?.quote?.[0];
      const close = quote?.close;
      return {
        price: meta.regularMarketPrice,
        bid: close?.[close.length - 1] * 0.999 || meta.regularMarketPrice,
        ask: close?.[close.length - 1] * 1.001 || meta.regularMarketPrice,
        volume: meta.regularMarketVolume ?? 0,
        open: quote?.open?.[0] ?? meta.previousClose,
        high: Math.max(...(quote?.high ?? [meta.regularMarketPrice])),
        low: Math.min(...(quote?.low ?? [meta.regularMarketPrice])),
        prevClose: meta.previousClose,
      };
    } catch {
      return null;
    }
  }

  private async fetchIndianAPI(symbol: string): Promise<FetchResult | null> {
    try {
      const res = await fetch(
        `https://data.indianapi.in/nse/quote/${symbol.toUpperCase()}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return null;
      const data: any = await res.json();
      return {
        price: data.price,
        bid: data.bid || data.price * 0.999,
        ask: data.ask || data.price * 1.001,
        volume: data.volume ?? 0,
        open: data.open ?? data.prevClose,
        high: data.high ?? data.price,
        low: data.low ?? data.price,
        prevClose: data.prevClose,
      };
    } catch {
      return null;
    }
  }

  private async fetchGroww(symbol: string): Promise<FetchResult | null> {
    try {
      const res = await fetch(
        `https://api.groww.in/v1/stock_market_quote/v2/${symbol.toUpperCase()}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return null;
      const data: any = await res.json();
      const p = data.payload;
      return {
        price: p.lastPrice,
        bid: p.bid || p.lastPrice * 0.999,
        ask: p.ask || p.lastPrice * 1.001,
        volume: p.volume ?? 0,
        open: p.open ?? p.previousClose,
        high: p.dayHigh ?? p.lastPrice,
        low: p.dayLow ?? p.lastPrice,
        prevClose: p.previousClose,
      };
    } catch {
      return null;
    }
  }
}

export const marketDataFetcher = new ClientMarketDataFetcher();
