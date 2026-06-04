import { RealtimeCoordinator } from "./RealtimeCoordinator";

export class MarketRefreshScheduler {
  private static timerId: number | null = null;
  private static listeners = new Set<() => void>();
  private static isFocused = true;
  private static isSearchActive = false;
  private static route = "dashboard";

  static start(onTick: () => void): void {
    this.listeners.add(onTick);
    this.scheduleNext();

    if (typeof window !== "undefined") {
      window.addEventListener("focus", this.handleFocus);
      window.addEventListener("blur", this.handleBlur);
    }
  }

  static stop(onTick: () => void): void {
    this.listeners.delete(onTick);
    if (this.listeners.size === 0 && this.timerId) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  static setRoute(route: string): void {
    this.route = route;
    this.scheduleNext();
  }

  static setSearchActive(active: boolean): void {
    this.isSearchActive = active;
    this.scheduleNext();
  }

  private static handleFocus = () => {
    this.isFocused = true;
    this.scheduleNext();
  };

  private static handleBlur = () => {
    this.isFocused = false;
    this.scheduleNext();
  };

  private static scheduleNext(): void {
    if (this.timerId) {
      window.clearTimeout(this.timerId);
    }

    const interval = RealtimeCoordinator.getRefreshIntervalMs(this.route, this.isSearchActive, this.isFocused);
    this.timerId = window.setTimeout(() => {
      this.listeners.forEach(listener => listener());
      this.scheduleNext();
    }, interval);
  }
}
