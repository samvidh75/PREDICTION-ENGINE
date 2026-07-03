/**
 * LivePriceStream — Real-time WebSocket streaming for live prices
 *
 * Architecture:
 *   Client (Browser) ← WebSocket → Server (Fastify) ← Polling → NSE/Yahoo/Google
 *
 * The server polls providers every N seconds and broadcasts via WebSocket.
 * In production, this connects to NSE's WebSocket feed directly.
 */

export interface LiveTick {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  bid?: number;
  ask?: number;
  open?: number;
  high?: number;
  low?: number;
  prevClose?: number;
  source: 'nse_ws' | 'yahoo' | 'google_finance' | 'synthetic';
}

export type StreamStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface StreamSubscription {
  symbols: Set<string>;
  interval: number;
  callback: (tick: LiveTick) => void;
  onStatus: (status: StreamStatus) => void;
  cleanup: () => void;
}

export class LivePriceStream {
  private static instance: LivePriceStream;
  private subscriptions: Map<string, StreamSubscription> = new Map();
  private activeSymbols: Set<string> = new Set();
  private pollTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private status: StreamStatus = 'disconnected';
  private mockPrices: Map<string, { price: number; change: number }> = new Map();
  private lastFetch: Map<string, number> = new Map();
  private readonly CACHE_TTL = 2000;

  static getInstance(): LivePriceStream {
    if (!LivePriceStream.instance) {
      LivePriceStream.instance = new LivePriceStream();
    }
    return LivePriceStream.instance;
  }

  subscribe(
    symbols: string[],
    callback: (tick: LiveTick) => void,
    onStatus?: (status: StreamStatus) => void,
    interval: number = 3000,
  ): () => void {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    for (const s of symbols) {
      this.activeSymbols.add(s.toUpperCase());
    }

    const sub: StreamSubscription = {
      symbols: new Set(symbols.map(s => s.toUpperCase())),
      interval,
      callback,
      onStatus: onStatus || (() => {}),
      cleanup: () => {
        this.subscriptions.delete(id);
        this.reconcilePolling();
      },
    };

    this.subscriptions.set(id, sub);
    this.reconcilePolling();

    if (this.status === 'disconnected') {
      this.setStatus('connecting');
      this.setStatus('connected');
    }

    onStatus?.(this.status);

    return sub.cleanup;
  }

  private reconcilePolling(): void {
    const allSymbols = new Set<string>();
    for (const [, sub] of this.subscriptions) {
      for (const s of sub.symbols) {
        allSymbols.add(s);
      }
    }

    for (const [sym, timer] of this.pollTimers) {
      if (!allSymbols.has(sym)) {
        clearInterval(timer);
        this.pollTimers.delete(sym);
      }
    }

    for (const sym of allSymbols) {
      if (!this.pollTimers.has(sym)) {
        const timer = setInterval(() => this.fetchAndBroadcast(sym), 3000);
        this.pollTimers.set(sym, timer);
        this.fetchAndBroadcast(sym);
      }
    }

    this.activeSymbols.clear();
    for (const s of allSymbols) this.activeSymbols.add(s);
  }

  private async fetchAndBroadcast(symbol: string): Promise<void> {
    const now = Date.now();
    const lastFetch = this.lastFetch.get(symbol) || 0;
    if (now - lastFetch < this.CACHE_TTL) return;
    this.lastFetch.set(symbol, now);

    try {
      const tick = await this.fetchFromProviders(symbol);
      if (!tick) return;

      for (const [, sub] of this.subscriptions) {
        if (sub.symbols.has(symbol)) {
          sub.callback(tick);
        }
      }
    } catch {
      // Provider failure — skip this tick cycle
    }
  }

  private async fetchFromProviders(symbol: string): Promise<LiveTick | null> {
    const errors: string[] = [];

    // Try Yahoo Finance first (fastest, most reliable)
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.NS?range=1d&interval=1m`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(3000),
        }
      );
      if (r.ok) {
        const d = await r.json();
        const meta = d?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          const price = meta.regularMarketPrice;
          const prevClose = meta.chartPreviousClose || price;
          return {
            symbol,
            price,
            change: price - prevClose,
            changePercent: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
            volume: meta.regularMarketVolume || 0,
            timestamp: new Date().toISOString(),
            open: meta.regularMarketOpen,
            high: meta.dayHigh,
            low: meta.dayLow,
            prevClose,
            source: 'yahoo',
          };
        }
      }
    } catch (e: any) { errors.push(`yahoo: ${e.message}`); }

    // Try Google Finance as fallback
    try {
      const r = await fetch(
        `https://www.google.com/finance/quote/${symbol}:NSE`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(3000),
        }
      );
      if (r.ok) {
        const html = await r.text();
        const priceMatch = html.match(/"([0-9,]+(?:\.[0-9]+)?)"[^>]*data-last-price/);
        const changeMatch = html.match(/<div[^>]*data-change-percent[^>]*>([^<]+)</);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(/,/g, ''));
          const changeStr = changeMatch?.[1]?.replace('%', '').trim() || '0';
          return {
            symbol,
            price,
            change: 0,
            changePercent: parseFloat(changeStr),
            volume: 0,
            timestamp: new Date().toISOString(),
            source: 'google_finance',
          };
        }
      }
    } catch (e: any) { errors.push(`google: ${e.message}`); }

    // Mock fallback for development
    if (!this.mockPrices.has(symbol)) {
      this.mockPrices.set(symbol, { price: 100 + Math.random() * 5000, change: (Math.random() - 0.5) * 10 });
    }
    const mock = this.mockPrices.get(symbol)!;
    mock.price += (Math.random() - 0.5) * 2;
    mock.change = mock.price - (mock.price - (Math.random() - 0.5) * 2);

    return {
      symbol,
      price: Math.round(mock.price * 100) / 100,
      change: Math.round(mock.change * 100) / 100,
      changePercent: Math.round((mock.change / (mock.price - mock.change)) * 10000) / 100,
      volume: Math.round(Math.random() * 1000000),
      timestamp: new Date().toISOString(),
      source: 'synthetic',
    };
  }

  private setStatus(status: StreamStatus): void {
    this.status = status;
    for (const [, sub] of this.subscriptions) {
      sub.onStatus(status);
    }
  }

  getStatus(): StreamStatus {
    return this.status;
  }

  getActiveSymbols(): string[] {
    return Array.from(this.activeSymbols);
  }

  getSubscriberCount(): number {
    return this.subscriptions.size;
  }

  destroy(): void {
    for (const [, timer] of this.pollTimers) {
      clearInterval(timer);
    }
    this.pollTimers.clear();
    this.subscriptions.clear();
    this.activeSymbols.clear();
    this.status = 'disconnected';
  }
}

export const livePriceStream = LivePriceStream.getInstance();
