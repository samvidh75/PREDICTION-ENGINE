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
  private mockIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Subscribe to live, frame-perfect price updates for a specific symbol
   */
  public subscribe(symbol: string, callback: TickerListener): () => void {
    const sym = symbol.toUpperCase();
    if (!this.listeners.has(sym)) {
      this.listeners.set(sym, new Set());
      this.startMockStream(sym);
    }
    
    this.listeners.get(sym)!.add(callback);

    return () => {
      const set = this.listeners.get(sym);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(sym);
          this.stopMockStream(sym);
        }
      }
    };
  }

  private startMockStream(symbol: string) {
    let currentPrice = 1000; // baseline fallback
    if (symbol === 'RELIANCE') currentPrice = 2850;
    else if (symbol === 'HAL') currentPrice = 3200;
    else if (symbol === 'BEL') currentPrice = 198;
    else if (symbol === 'IRFC') currentPrice = 175;

    const interval = setInterval(() => {
      const change = (Math.random() * 2 - 1); // stochastic drift
      currentPrice = Number((currentPrice + change).toFixed(2));
      const changePercent = Number(((change / currentPrice) * 100).toFixed(2));

      const tick: PriceTick = {
        symbol,
        price: currentPrice,
        change: Number(change.toFixed(2)),
        changePercent,
        timestamp: new Date().toISOString()
      };

      const set = this.listeners.get(symbol);
      if (set) {
        set.forEach(listener => listener(tick));
      }
    }, 1500); // UI updates comfortably every 1.5s

    this.mockIntervals.set(symbol, interval);
  }

  private stopMockStream(symbol: string) {
    const interval = this.mockIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.mockIntervals.delete(symbol);
    }
  }
}

export const realtimeStateManager = new RealtimeStateManager();
export default realtimeStateManager;
