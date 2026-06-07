import { MarketSubscriptionEngine } from './MarketSubscriptionEngine';

export class RouteAwareRefreshEngine {
  private static activeSymbol: string | null = null;

  /**
   * Optimizes CPU/Network by refreshing only the active stock aggressively (1.5s)
   * while shifting background stocks to a lazy refresh cycle (10s)
   */
  public static updateActiveViewport(symbol: string | null): void {
    if (this.activeSymbol) {
      MarketSubscriptionEngine.deregisterInterest(this.activeSymbol);
    }
    
    this.activeSymbol = symbol;
    
    if (symbol) {
      MarketSubscriptionEngine.registerInterest(symbol);
    }
  }

  public static getRefreshInterval(symbol: string): number {
    const sym = symbol.toUpperCase();
    return this.activeSymbol === sym ? 1500 : 10000;
  }
}

export default RouteAwareRefreshEngine;
