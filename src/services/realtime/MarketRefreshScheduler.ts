import { RouteAwareRefreshEngine } from './RouteAwareRefreshEngine';
import { MarketSubscriptionEngine } from './MarketSubscriptionEngine';

export class MarketRefreshScheduler {
  private static activeJobs: Map<string, NodeJS.Timeout> = new Map();

  public static scheduleSync(symbol: string, job: () => void): void {
    const sym = symbol.toUpperCase();
    this.unscheduleSync(sym);

    const interval = RouteAwareRefreshEngine.getRefreshInterval(sym);
    const timer = setInterval(() => {
      job();
    }, interval);

    this.activeJobs.set(sym, timer);
    MarketSubscriptionEngine.registerInterest(sym);
  }

  public static unscheduleSync(symbol: string): void {
    const sym = symbol.toUpperCase();
    const timer = this.activeJobs.get(sym);
    if (timer) {
      clearInterval(timer);
      this.activeJobs.delete(sym);
      MarketSubscriptionEngine.deregisterInterest(sym);
    }
  }
}

export default MarketRefreshScheduler;
