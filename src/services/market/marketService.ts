import { WebsocketManager, type MarketWebsocketEvent } from "./websocketManager";
import { MarketStateEngine } from "./marketStateEngine";
import type { MarketInputs } from "../../services/intelligence/marketState";
import type { MarketState } from "../../types/MarketState";

export type MarketConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

export type MarketComposite = {
  at: number;

  marketState: MarketState;
  marketInputs: MarketInputs;

  connectionStatus: MarketConnectionStatus;
};

type Subscriber = (snapshot: MarketComposite) => void;

function now(): number {
  return Date.now();
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * MarketService
 * - persistent websocket manager
 * - normalizes via MarketStateEngine
 * - publishes composite snapshots
 * - applies minimal batching to prevent render storms
 */
export class MarketService {
  private ws = new WebsocketManager();
  private engine = new MarketStateEngine({ alpha: 0.18 });

  private subscribers: Set<Subscriber> = new Set();

  private connectionStatus: MarketConnectionStatus = "disconnected";

  private lastState: MarketState = {
    at: now(),
    nifty: 22400,
    sensex: 73800,
    bankNifty: 48900,
    vix: 12.4,
    breadthPct: 52,
    fiiDiiTone: 0.4,
  };

  private pendingEmit: number | null = null;

  private cacheSnapshot: MarketComposite = {
    at: now(),
    marketState: this.lastState,
    marketInputs: this.engine.update(this.lastState),
    connectionStatus: this.connectionStatus,
  };

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);

    // immediate snapshot so UI is never blank
    fn(this.cacheSnapshot);

    return () => {
      this.subscribers.delete(fn);
    };
  }

  getConnectionStatus(): MarketConnectionStatus {
    return this.connectionStatus;
  }

  getSnapshot(): MarketComposite {
    return this.cacheSnapshot;
  }

  start(): void {
    this.ws.subscribe((ev) => this.onEvent(ev));
    this.ws.connect();
  }

  stop(): void {
    this.ws.disconnect();
  }

  private publishSnapshot(next: MarketComposite): void {
    this.cacheSnapshot = next;
    for (const fn of this.subscribers) fn(next);
  }

  private scheduleEmit(nextSnapshot: MarketComposite): void {
    // Batch to a calm cadence (>= ~1s) so “continuously alive” doesn't become “refreshing constantly”.
    const MIN_MS = 1000;

    if (this.pendingEmit) return;

    this.pendingEmit = window.setTimeout(() => {
      this.pendingEmit = null;
      this.publishSnapshot(nextSnapshot);
    }, MIN_MS);
  }

  private onEvent(ev: MarketWebsocketEvent): void {
    if (ev.type === "connection_status") {
      const nextStatus = ev.payload.status;
      this.connectionStatus = nextStatus;
      this.scheduleEmit({
        at: ev.at,
        marketState: this.lastState,
        marketInputs: this.engine.update(this.lastState),
        connectionStatus: nextStatus,
      });
      return;
    }

    if (ev.type === "market_prices") {
      this.lastState = {
        ...this.lastState,
        at: ev.at,
        nifty: clamp(ev.payload.nifty, 15000, 40000),
        sensex: clamp(ev.payload.sensex, 50000, 120000),
        bankNifty: clamp(ev.payload.bankNifty, 25000, 80000),
      };
    }

    if (ev.type === "market_volatility") {
      this.lastState = {
        ...this.lastState,
        at: ev.at,
        vix: clamp(ev.payload.vix, 8, 30),
      };
    }

    if (ev.type === "market_breadth") {
      this.lastState = {
        ...this.lastState,
        at: ev.at,
        breadthPct: clamp(ev.payload.breadthPct, 25, 85),
      };
    }

    if (ev.type === "institutional_flows") {
      this.lastState = {
        ...this.lastState,
        at: ev.at,
        fiiDiiTone: clamp(ev.payload.fiiDiiTone, -2, 2),
      };
    }

    // Compose after any non-connection event.
    const marketInputs = this.engine.update(this.lastState);
    const snapshot: MarketComposite = {
      at: ev.at,
      marketState: this.lastState,
      marketInputs,
      connectionStatus: this.connectionStatus,
    };
    this.scheduleEmit(snapshot);
  }
}
