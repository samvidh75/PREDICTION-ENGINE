import type { MarketConnectionStatus, MarketComposite } from "./marketService";
import { MarketService } from "./marketService";
import { routeIntensityStore, type RouteIntensity } from "../charting/live/routeIntensityStore";
import { backgroundThrottleController, type BackgroundState } from "../realtime/backgroundThrottleController";

class SharedMarketServiceManager {
  private readonly service = new MarketService();

  private subscriberCount = 0;

  private route: RouteIntensity = routeIntensityStore.getIntensity();
  private background: BackgroundState = backgroundThrottleController.getState();

  private started = false;

  private lastStartStopAt = 0;
  private readonly MIN_TOGGLE_MS = 2500;

  private unsubs: Array<() => void> = [];

  constructor() {
    // Keep policy signals up to date.
    const unsubRoute = routeIntensityStore.subscribe((i) => {
      this.route = i;
      this.sync();
    });
    const unsubBg = backgroundThrottleController.subscribe((s) => {
      this.background = s;
      this.sync();
    });

    this.unsubs.push(unsubRoute, unsubBg);

    // Initial sync.
    this.sync();
  }

  private shouldRun(): boolean {
    if (this.subscriberCount <= 0) return false;
    if (this.background === "hidden") return false;

    // Low-priority routes shouldn't keep websocket polling alive.
    return this.route === "high" || this.route === "medium";
  }

  private sync(): void {
    const should = this.shouldRun();
    const t = Date.now();

    if (should === this.started) return;
    if (t - this.lastStartStopAt < this.MIN_TOGGLE_MS) return;

    this.lastStartStopAt = t;

    if (should) {
      this.service.start();
      this.started = true;
    } else {
      this.service.stop();
      this.started = false;
    }
  }

  acquire(): MarketService {
    this.subscriberCount += 1;
    this.sync();
    return this.service;
  }

  release(): void {
    this.subscriberCount = Math.max(0, this.subscriberCount - 1);
    this.sync();
  }

  getSnapshot(): MarketComposite {
    return this.service.getSnapshot();
  }

  getConnectionStatus(): MarketConnectionStatus {
    return this.service.getConnectionStatus();
  }
}

export const sharedMarketServiceManager = new SharedMarketServiceManager();
