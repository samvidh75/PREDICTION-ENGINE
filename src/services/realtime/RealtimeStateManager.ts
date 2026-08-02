export type PriceTick = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
};

type TickerListener = (tick: PriceTick) => void;

class RealtimeStateManager {
  private listeners: Map<string, Set<TickerListener>> = new Map();
  private pollIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private lastPrices: Map<string, number> = new Map();

  /**
   * Subscribe to live price updates for a specific symbol.
   * Polls the /api/market-data/quote/:symbol endpoint every 30 seconds.
   */
  public subscribe(symbol: string, callback: TickerListener): () => void {
    const sym = symbol.toUpperCase();
    if (!this.listeners.has(sym)) {
      this.listeners.set(sym, new Set());
      this.startLivePolling(sym);
    }
    
    this.listeners.get(sym)!.add(callback);

    return () => {
      const set = this.listeners.get(sym);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(sym);
          this.stopPolling(sym);
        }
      }
    };
  }

  private startLivePolling(symbol: string) {
    const poll = async () => {
      try {
        const response = await fetch(`/api/market-data/quote/${encodeURIComponent(symbol)}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;

        const quote = await response.json();
        if (!quote || typeof quote.price !== "number" || !Number.isFinite(quote.price)) return;

        const prevPrice = this.lastPrices.get(symbol);
        const currentPrice = quote.price;
        const change = prevPrice !== undefined ? currentPrice - prevPrice : 0;
        const changePercent = prevPrice && prevPrice !== 0 ? (change / prevPrice) * 100 : 0;
        this.lastPrices.set(symbol, currentPrice);

        const tick: PriceTick = {
          symbol,
          price: currentPrice,
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          timestamp: quote.updatedAt || new Date().toISOString()
        };

        const set = this.listeners.get(symbol);
        if (set) {
          set.forEach(listener => listener(tick));
        }
      } catch {
        // Silently skip failed polls - the next interval will retry
      }
    };

    // Initial fetch immediately
    poll();
    // Poll every 30 seconds
    const interval = setInterval(poll, 30_000);
    this.pollIntervals.set(symbol, interval);
  }

  private stopPolling(symbol: string) {
    const interval = this.pollIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(symbol);
    }
    this.lastPrices.delete(symbol);
  }
}

export const realtimeStateManager = new RealtimeStateManager();
export default realtimeStateManager;
