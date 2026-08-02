export type WebsocketConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

export type MarketWebsocketEvent =
  | { type: "market_prices"; at: number; payload: { pseiIndex: number; pseiComposite: number; financialsIndexValue: number } }
  | { type: "market_volatility"; at: number; payload: { vix: number } }
  | { type: "market_breadth"; at: number; payload: { breadthPct: number } }
  | { type: "institutional_flows"; at: number; payload: { foreignDomesticFlowTone: number } }
  | { type: "connection_status"; at: number; payload: { status: WebsocketConnectionStatus } };

type Subscriber = (ev: MarketWebsocketEvent) => void;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const MARKET_SIMULATION_ENABLED = import.meta.env.VITE_MARKET_SIMULATION === "1";

/**
 * WebsocketManager
 * - persistent manager
 * - debounces + batches updates
 * - simulates realtime feed until real PSE/TradingView endpoints are wired
 */
export class WebsocketManager {
  private status: WebsocketConnectionStatus = "disconnected";
  private subscribers: Set<Subscriber> = new Set();
  private simTimer: number | null = null;
  private lastEmitAt = 0;

  // synthetic state — plausible PSEi-range values, not live data
  private pseiIndex = 6500;
  private pseiComposite = 6480;
  private financialsIndexValue = 2200;
  private vix = 12.4;
  private breadthPct = 52;
  private foreignDomesticFlowTone = 0.4;

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);

    // Immediately send status so UI can render “reconnecting…” instead of blank states.
    fn({
      type: "connection_status",
      at: Date.now(),
      payload: { status: this.status },
    });

    return () => {
      this.subscribers.delete(fn);
    };
  }

  getStatus(): WebsocketConnectionStatus {
    return this.status;
  }

  connect(): void {
    if (this.status === "connecting" || this.status === "connected") return;

    this.updateStatus("connecting");

    // No-fake-live rule:
    // Unless explicitly enabled, we do NOT emit synthetic prices.
    if (!MARKET_SIMULATION_ENABLED) {
      window.setTimeout(() => {
        this.updateStatus("disconnected");
      }, 450);
      return;
    }

    // simulate connect handshake (dev-only)
    window.setTimeout(() => {
      this.updateStatus("connected");

      if (this.simTimer) window.clearInterval(this.simTimer);

      // Market shifts (1–3s). We emit small updates more frequently and batch into a calm cadence.
      this.simTimer = window.setInterval(() => {
        this.emitMarketTick();
      }, 1200);
    }, 350);
  }

  disconnect(): void {
    if (this.simTimer) window.clearInterval(this.simTimer);
    this.simTimer = null;
    this.updateStatus("disconnected");
  }

  private updateStatus(next: WebsocketConnectionStatus): void {
    this.status = next;
    this.publish({
      type: "connection_status",
      at: Date.now(),
      payload: { status: next },
    });
  }

  private publish(ev: MarketWebsocketEvent): void {
    for (const fn of this.subscribers) fn(ev);
  }

  private emitMarketTick(): void {
    const now = Date.now();
    const elapsed = now - this.lastEmitAt;
    this.lastEmitAt = now;

    // Keep updates calm: never emit “everything” faster than ~1s.
    if (elapsed < 900) return;

    const t = now / 1000;
    const n1 = seededNoise(t + 1);
    const n2 = seededNoise(t + 2);
    const n3 = seededNoise(t + 3);
    const n4 = seededNoise(t + 4);

    // small drift
    const drift = (n1 - 0.5) * 0.9;

    this.pseiIndex = clamp(this.pseiIndex + drift * 8, 6000, 7500);
    this.pseiComposite = clamp(this.pseiComposite + drift * 14, 6000, 7500);
    this.financialsIndexValue = clamp(this.financialsIndexValue + drift * 10, 1800, 2700);

    // VIX and breadth are more “tensional”: smaller movement, but directionally meaningful.
    const vixDrift = (n2 - 0.5) * 0.25;
    this.vix = clamp(this.vix + vixDrift, 10.2, 18.5);

    const breadthDrift = (n3 - 0.5) * 1.4;
    this.breadthPct = clamp(this.breadthPct + breadthDrift, 35, 72);

    const flowDrift = (n4 - 0.5) * 0.10;
    this.foreignDomesticFlowTone = clamp(this.foreignDomesticFlowTone + flowDrift, -1.6, 1.6);

    // Publish in a batched “frame” (UI will normalize/throttle later).
    this.publish({
      type: "market_prices",
      at: now,
      payload: {
        pseiIndex: this.pseiIndex,
        pseiComposite: this.pseiComposite,
        financialsIndexValue: this.financialsIndexValue,
      },
    });

    this.publish({
      type: "market_volatility",
      at: now,
      payload: { vix: this.vix },
    });

    this.publish({
      type: "market_breadth",
      at: now,
      payload: { breadthPct: this.breadthPct },
    });

    this.publish({
      type: "institutional_flows",
      at: now,
      payload: { foreignDomesticFlowTone: this.foreignDomesticFlowTone },
    });

    // Simulated occasional reconnect (professional calm handling).
    // Kept rare to avoid UI churn.
    if (seededNoise(t + 999) > 0.995) {
      this.updateStatus("reconnecting");
      window.setTimeout(() => this.updateStatus("connected"), 900);
    }
  }
}
