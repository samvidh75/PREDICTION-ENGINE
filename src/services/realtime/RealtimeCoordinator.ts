import { realtimeStateManager, PriceTick } from './RealtimeStateManager';
import { marketStateCoordinator, GlobalMarketMood } from './MarketStateCoordinator';

export class RealtimeCoordinator {
  /**
   * Global gateway for all live telemetry subscriptions
   */
  public static subscribeToStock(symbol: string, callback: (tick: PriceTick) => void): () => void {
    return realtimeStateManager.subscribe(symbol, callback);
  }

  /**
   * Subscribes to global market atmosphere triggers
   */
  public static subscribeToMarketMood(callback: (mood: GlobalMarketMood) => void): () => void {
    return marketStateCoordinator.subscribeMood(callback);
  }
}

export default RealtimeCoordinator;
