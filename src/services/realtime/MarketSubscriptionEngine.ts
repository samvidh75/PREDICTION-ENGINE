export class MarketSubscriptionEngine {
  private static activeSubscribers = new Set<string>();

  public static registerInterest(symbol: string): void {
    this.activeSubscribers.add(symbol.toUpperCase());
  }

  public static deregisterInterest(symbol: string): void {
    this.activeSubscribers.delete(symbol.toUpperCase());
  }

  public static getInterestedTickers(): string[] {
    return Array.from(this.activeSubscribers);
  }
}

export default MarketSubscriptionEngine;
