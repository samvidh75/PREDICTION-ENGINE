export class MarketSubscriptionEngine {
  private static activeSubscriptions = new Set<string>();

  static subscribe(ticker: string): void {
    this.activeSubscriptions.add(ticker.toUpperCase());
  }

  static unsubscribe(ticker: string): void {
    this.activeSubscriptions.delete(ticker.toUpperCase());
  }

  static getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions);
  }

  static isSubscribed(ticker: string): boolean {
    return this.activeSubscriptions.has(ticker.toUpperCase());
  }
}
