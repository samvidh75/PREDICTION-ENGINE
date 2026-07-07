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
  source: string;
}

interface QueueItem {
  symbol: string;
  resolve: (data: FetchResult) => void;
  reject: (err: Error) => void;
}

interface ProviderHealth {
  name: string;
  failures: number;
  lastFailure: number;
  cooldownUntil: number;
  totalCalls: number;
  totalSuccess: number;
  avgLatency: number;
}

const RATE_LIMIT_MS = 3000;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY = 1000;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_COOLDOWN_MS = 120_000;
const FETCH_TIMEOUT_MS = 7000;

export class ClientMarketDataFetcher {
  private cache = new IndexedDBCache();
  private requestQueue: QueueItem[] = [];
  private isProcessing = false;
  private providerHealth: Map<string, ProviderHealth> = new Map();
  private retryCounts: Map<string, number> = new Map();

  constructor() {
    const providers = [
      'YFinance', 'PhilippineAPI', 'Groww', 'PSEIndia', 'Screener', 'Moneycontrol',
    ];
    for (const name of providers) {
      this.providerHealth.set(name, {
        name,
        failures: 0,
        lastFailure: 0,
        cooldownUntil: 0,
        totalCalls: 0,
        totalSuccess: 0,
        avgLatency: 0,
      });
    }
  }

  async fetch(symbol: string): Promise<FetchResult> {
    const cached = await this.cache.getQuote(symbol);
    if (cached) {
      return { ...cached, source: 'cache' };
    }
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ symbol, resolve, reject });
      this.processQueue();
    });
  }

  getProviderHealth(): ProviderHealth[] {
    return Array.from(this.providerHealth.values());
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  async warmCache(symbols: string[]): Promise<{ symbol: string; ok: boolean }[]> {
    const results: { symbol: string; ok: boolean }[] = [];
    for (const symbol of symbols) {
      try {
        const data = await this.fetch(symbol);
        results.push({ symbol, ok: !!data });
      } catch {
        results.push({ symbol, ok: false });
      }
    }
    return results;
  }

  private isProviderHealthy(name: string): boolean {
    const health = this.providerHealth.get(name);
    if (!health) return false;
    if (health.cooldownUntil > Date.now()) return false;
    if (health.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      health.cooldownUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
      return false;
    }
    return true;
  }

  private recordSuccess(name: string, latency: number) {
    const health = this.providerHealth.get(name);
    if (!health) return;
    health.totalCalls++;
    health.totalSuccess++;
    health.failures = 0;
    health.avgLatency = health.avgLatency === 0
      ? latency
      : (health.avgLatency * 0.7 + latency * 0.3);
  }

  private recordFailure(name: string) {
    const health = this.providerHealth.get(name);
    if (!health) return;
    health.totalCalls++;
    health.failures++;
    health.lastFailure = Date.now();
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
      const retryKey = `${symbol}_${Date.now()}`;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const data = await this.tryFetch(symbol);
          if (data) {
            await this.cache.setQuote(
              symbol, data.price, data.bid, data.ask,
              data.volume, data.open, data.high, data.low, data.prevClose
            );
            resolve(data);
            return;
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }

        if (attempt < MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY * Math.pow(2, attempt) + Math.random() * 500;
          await new Promise(r => setTimeout(r, delay));
        }
      }

      reject(lastError || new Error(`Failed to fetch ${symbol}`));

      if (this.requestQueue.length > 0) {
        setTimeout(processNext, RATE_LIMIT_MS);
      } else {
        this.isProcessing = false;
      }
    };

    processNext();
  }

  private async tryFetch(symbol: string): Promise<FetchResult | null> {
    const providers: Array<{ name: string; fn: (sym: string) => Promise<FetchResult | null> }> = [
      { name: 'YFinance', fn: this.fetchYFinance.bind(this) },
      { name: 'PSEIndia', fn: this.fetchPSEIndia.bind(this) },
      { name: 'Groww', fn: this.fetchGroww.bind(this) },
      { name: 'PhilippineAPI', fn: this.fetchIndianAPI.bind(this) },
      { name: 'Screener', fn: this.fetchScreener.bind(this) },
      { name: 'Moneycontrol', fn: this.fetchMoneycontrol.bind(this) },
    ];

    for (const { name, fn } of providers) {
      if (!this.isProviderHealthy(name)) continue;
      const start = performance.now();
      try {
        const result = await fn(symbol);
        const latency = performance.now() - start;
        if (result) {
          this.recordSuccess(name, latency);
          return { ...result, source: name };
        }
        this.recordFailure(name);
      } catch {
        this.recordFailure(name);
      }
    }
    return null;
  }

  private async fetchYFinance(symbol: string): Promise<FetchResult | null> {
    try {
      const ticker = `${symbol}.NS`;
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d`,
        { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
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
        source: '',
      };
    } catch {
      return null;
    }
  }

  private async fetchIndianAPI(symbol: string): Promise<FetchResult | null> {
    try {
      const res = await fetch(
        `https://data.indianapi.in/nse/quote/${symbol.toUpperCase()}`,
        { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
      );
      if (!res.ok) return null;
      const data: any = await res.json();
      if (!data || !data.price) return null;
      return {
        price: data.price,
        bid: data.bid || data.price * 0.999,
        ask: data.ask || data.price * 1.001,
        volume: data.volume ?? 0,
        open: data.open ?? data.prevClose,
        high: data.high ?? data.price,
        low: data.low ?? data.price,
        prevClose: data.prevClose,
        source: '',
      };
    } catch {
      return null;
    }
  }

  private async fetchGroww(symbol: string): Promise<FetchResult | null> {
    try {
      const res = await fetch(
        `https://api.groww.in/v1/stock_market_quote/v2/${symbol.toUpperCase()}`,
        { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
      );
      if (!res.ok) return null;
      const data: any = await res.json();
      const p = data.payload;
      if (!p || !p.lastPrice) return null;
      return {
        price: p.lastPrice,
        bid: p.bid || p.lastPrice * 0.999,
        ask: p.ask || p.lastPrice * 1.001,
        volume: p.volume ?? 0,
        open: p.open ?? p.previousClose,
        high: p.dayHigh ?? p.lastPrice,
        low: p.dayLow ?? p.lastPrice,
        prevClose: p.previousClose,
        source: '',
      };
    } catch {
      return null;
    }
  }

  private async fetchPSEIndia(symbol: string): Promise<FetchResult | null> {
    try {
      const ticker = symbol.toUpperCase();
      const res = await fetch(
        `https://www.nseindia.com/api/quote-equity?symbol=${ticker}`,
        {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            'Accept': 'application/json',
            'Referer': 'https://www.nseindia.com/',
          },
        }
      );
      if (!res.ok) return null;
      const data: any = await res.json();
      const p = data.priceInfo;
      if (!p) return null;
      return {
        price: p.lastPrice,
        bid: p.lowerCP || p.lastPrice * 0.999,
        ask: p.upperCP || p.lastPrice * 1.001,
        volume: p.totalTradedVolume ?? 0,
        open: p.open ?? p.previousClose,
        high: p.intraDayHighLow?.max ?? p.lastPrice,
        low: p.intraDayHighLow?.min ?? p.lastPrice,
        prevClose: p.previousClose,
        source: '',
      };
    } catch {
      return null;
    }
  }

  private async fetchScreener(symbol: string): Promise<FetchResult | null> {
    try {
      const res = await fetch(
        `https://www.screener.in/api/company/${symbol.toUpperCase()}/quote/`,
        {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            'Accept': 'application/json',
          },
        }
      );
      if (!res.ok) return null;
      const data: any = await res.json();
      if (!data || !data.price) return null;
      return {
        price: data.price,
        bid: data.price * 0.999,
        ask: data.price * 1.001,
        volume: data.volume ?? 0,
        open: data.open ?? data.prev_close,
        high: data.high ?? data.price,
        low: data.low ?? data.price,
        prevClose: data.prev_close,
        source: '',
      };
    } catch {
      return null;
    }
  }

  private async fetchMoneycontrol(symbol: string): Promise<FetchResult | null> {
    try {
      const res = await fetch(
        `https://priceapi.moneycontrol.com/pricefeed/notapplicable/inidicesindia/in%2B${symbol.toUpperCase()}`,
        {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          },
        }
      );
      if (!res.ok) return null;
      const data: any = await res.json();
      if (!data) return null;
      return {
        price: data.pricecurrent,
        bid: data.pricecurrent * 0.999,
        ask: data.pricecurrent * 1.001,
        volume: data.totqty ?? 0,
        open: data.priceopen ?? data.pricecurrent,
        high: data.pricehigh ?? data.pricecurrent,
        low: data.pricelow ?? data.pricecurrent,
        prevClose: data.priceprevclose,
        source: '',
      };
    } catch {
      return null;
    }
  }
}

export const marketDataFetcher = new ClientMarketDataFetcher();
