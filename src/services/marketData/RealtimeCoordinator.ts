export class RealtimeCoordinator {
  private static activeTicker: string | null = null;

  static setActiveTicker(ticker: string | null): void {
    this.activeTicker = ticker ? ticker.toUpperCase() : null;
  }

  static getActiveTicker(): string | null {
    return this.activeTicker;
  }

  /**
   * Adaptive Refresh rate calculation based on Section 115 and 116.
   * Dashboard = 15s
   * Active Stock Page = 5s
   * Active Search Open = 2s
   * Background = 60s
   */
  static getRefreshIntervalMs(currentRoute: string, searchOpen: boolean, windowFocused: boolean): number {
    if (!windowFocused) {
      return 60000; // Background tab = 60 seconds
    }

    if (searchOpen) {
      return 2000; // Active Search = 2 seconds
    }

    if (currentRoute.includes("stock") && this.activeTicker) {
      return 5000; // Active Stock Page = 5 seconds
    }

    return 15000; // Dashboard / generic = 15 seconds
  }
}
