/**
 * LivePriceStream — client-side polling of the real PSE quote endpoint.
 *
 * There is no public real-time push feed for the PSE reachable from this
 * app, so "live" here means short-interval polling of /api/market-data/quote,
 * which itself proxies the phisix live snapshot feed. No synthetic data is
 * ever generated — a provider failure simply skips that tick.
 */

export interface LiveTick {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  high?: number;
  low?: number;
  source: 'pse_quote';
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
      const tick = await this.fetchQuote(symbol);
      if (!tick) {
        this.setStatus('error');
        return;
      }
      this.setStatus('connected');

      for (const [, sub] of this.subscriptions) {
        if (sub.symbols.has(symbol)) {
          sub.callback(tick);
        }
      }
    } catch {
      this.setStatus('error');
    }
  }

  private async fetchQuote(symbol: string): Promise<LiveTick | null> {
    const r = await fetch(`/api/market-data/quote/${encodeURIComponent(symbol)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const quote = await r.json();
    if (!quote || typeof quote.price !== 'number' || !Number.isFinite(quote.price)) return null;

    return {
      symbol,
      price: quote.price,
      change: quote.change ?? 0,
      changePercent: quote.changePercent ?? 0,
      volume: 0,
      timestamp: new Date().toISOString(),
      source: 'pse_quote',
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
