import type { MarketInputs } from "../../services/intelligence/marketState";
import type { MarketState } from "../../types/MarketState";
import type { MarketIndexEvent, MarketIndexProvider } from "./providers/MarketIndexProvider";
import { WebsocketMarketIndexProvider } from "./providers/WebsocketMarketIndexProvider";
import { MarketStateEngine } from "./marketStateEngine";
import { pushMarketDiag } from "./marketDiagnostics";

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
 * - provider-backed market index streaming
 * - normalizes via MarketStateEngine
 * - publishes composite snapshots
 * - applies minimal batching to prevent render storms
 *
 * Resilience goals:
 * - UI must never collapse due to provider instability
 * - watchdog + controlled reconnect on “silent failures”
 * - graceful degradation back to disconnected with background recovery
 */
export class MarketService {
  private provider: MarketIndexProvider;
  private engine = new MarketStateEngine({ alpha: 0.18 });

  private subscribers: Set<Subscriber> = new Set();

  private connectionStatus: MarketConnectionStatus = "disconnected";

  private lastState: MarketState = {
    at: now(),
    pse-index: 22400,
    pse-composite: 73800,
    bankPSE-Index: 48900,
    vix: 12.4,
    breadthPct: 52,
    fiiDiiTone: 0.4,
  };

  private pendingEmit: number | null = null;
  private unsubProvider: (() => void) | null = null;

  // Watchdog / retry state
  private lastEventAt = now();
  private watchdogIntervalId: number | null = null;
  private reconnectAttempt = 0;
  private reconnectTimeoutId: number | null = null;

  // Tunables (conservative to avoid UI churn)
  private readonly MAX_SILENCE_MS = 8000;
  private readonly WATCHDOG_CHECK_EVERY_MS = 2000;
  private readonly MAX_RECONNECT_ATTEMPTS = 6;
  private readonly BASE_RECONNECT_BACKOFF_MS = 600;
  private readonly MAX_RECONNECT_BACKOFF_MS = 12000;
  private readonly DISCONNECTED_RECOVERY_COOLDOWN_MS = 25000;

  private cacheSnapshot: MarketComposite = {
    at: now(),
    marketState: this.lastState,
    marketInputs: this.engine.update(this.lastState),
    connectionStatus: this.connectionStatus,
  };

  constructor(args?: { provider?: MarketIndexProvider }) {
    this.provider = args?.provider ?? new WebsocketMarketIndexProvider();
  }

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
    if (this.unsubProvider) return;

    // Initial local status so UI can label “connecting…” immediately.
    this.setConnectionStatus("connecting");

    this.unsubProvider = this.provider.subscribe((ev) => this.onEvent(ev));
    this.provider.start();

    this.lastEventAt = now();
    this.reconnectAttempt = 0;
    this.startWatchdog();
  }

  stop(): void {
    if (this.unsubProvider) {
      this.unsubProvider();
      this.unsubProvider = null;
    }

    this.stopWatchdog();
    if (this.reconnectTimeoutId) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.provider.stop();
    this.setConnectionStatus("disconnected");
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
      pushMarketDiag({ type: "emit_publish", at: now(), conn: this.connectionStatus, batched: true });
      this.publishSnapshot(nextSnapshot);
    }, MIN_MS);
  }

  private setConnectionStatus(next: MarketConnectionStatus): void {
    if (this.connectionStatus === next) return;

    this.connectionStatus = next;
    pushMarketDiag({ type: "connection_status", at: now(), status: next });

    this.scheduleEmit({
      at: now(),
      marketState: this.lastState,
      marketInputs: this.engine.update(this.lastState),
      connectionStatus: next,
    });
  }

  private startWatchdog(): void {
    if (this.watchdogIntervalId) return;

    this.watchdogIntervalId = window.setInterval(() => {
      this.checkWatchdog();
    }, this.WATCHDOG_CHECK_EVERY_MS);
  }

  private stopWatchdog(): void {
    if (!this.watchdogIntervalId) return;
    window.clearInterval(this.watchdogIntervalId);
    this.watchdogIntervalId = null;
  }

  private checkWatchdog(): void {
    // If we have subscribers, we want to keep the stream “alive”.
    if (this.subscribers.size === 0) return;

    const tNow = now();
    const silenceForMs = tNow - this.lastEventAt;

    // If we’re offline/disconnected, don’t spam reconnect cycles.
    if (this.connectionStatus === "disconnected") return;

    if (silenceForMs < this.MAX_SILENCE_MS) return;

    pushMarketDiag({ type: "watchdog_trigger", at: tNow, silenceMs: silenceForMs });

    this.triggerReconnect(`watchdog_silence_${silenceForMs}ms`);
  }

  private triggerReconnect(reason: string): void {
    void reason; // reserved for future diagnostics/logging

    // Avoid overlapping reconnects.
    if (this.reconnectTimeoutId) return;

    if (this.reconnectAttempt >= this.MAX_RECONNECT_ATTEMPTS) {
      // Controlled degradation: go disconnected and wait before retrying.
      pushMarketDiag({ type: "reconnect_give_up", at: now(), attempts: this.reconnectAttempt });

      this.reconnectAttempt = 0;
      this.setConnectionStatus("disconnected");

      this.reconnectTimeoutId = window.setTimeout(() => {
        this.reconnectTimeoutId = null;
        // Start again if there are consumers.
        if (this.subscribers.size > 0) {
          this.setConnectionStatus("connecting");
          try {
            this.provider.start();
          } finally {
            this.lastEventAt = now();
            this.startWatchdog();
          }
        }
      }, this.DISCONNECTED_RECOVERY_COOLDOWN_MS);

      return;
    }

    this.reconnectAttempt += 1;

    {
      const backoffMs = Math.min(
        this.MAX_RECONNECT_BACKOFF_MS,
        this.BASE_RECONNECT_BACKOFF_MS * Math.pow(2, Math.max(0, this.reconnectAttempt - 1)),
      );

      pushMarketDiag({
        type: "reconnect_attempt",
        at: now(),
        attempt: this.reconnectAttempt,
        reason,
        backoffMs,
      });
    }

    // Mark local status immediately so UI stays trustworthy.
    this.setConnectionStatus("reconnecting");

    // Hard stop + backoff start
    try {
      this.provider.stop();
    } catch {
      // Provider errors must not collapse the UI.
    }

    const delay = Math.min(
      this.MAX_RECONNECT_BACKOFF_MS,
      this.BASE_RECONNECT_BACKOFF_MS * Math.pow(2, Math.max(0, this.reconnectAttempt - 1)),
    );

    this.reconnectTimeoutId = window.setTimeout(() => {
      this.reconnectTimeoutId = null;

      try {
        this.provider.start();
      } finally {
        // Give it a fresh window.
        this.lastEventAt = now();
        // If it succeeds, provider will emit a real connection_status shortly.
        // If it fails again, watchdog will trigger again.
      }
    }, delay);
  }

  private onEvent(ev: MarketIndexEvent): void {
    // Any provider message is evidence the stream is alive.
    this.lastEventAt = now();

    // Reset reconnect attempt on any “connected” signal.
    if (ev.type === "connection_status") {
      const nextStatus = ev.payload.status as MarketConnectionStatus;
      this.connectionStatus = nextStatus;

      pushMarketDiag({ type: "connection_status", at: ev.at, status: nextStatus });

      if (nextStatus === "connected") {
        this.reconnectAttempt = 0;

        pushMarketDiag({ type: "reconnect_success_signal", at: ev.at, status: nextStatus });

        // A successful connection should cancel any pending reconnect.
        if (this.reconnectTimeoutId) {
          window.clearTimeout(this.reconnectTimeoutId);
          this.reconnectTimeoutId = null;
        }
      }
    }

    try {
      if (ev.type === "connection_status") {
        const nextStatus = ev.payload.status as MarketConnectionStatus;
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
          pse-index: clamp(ev.payload.pse-index, 15000, 40000),
          pse-composite: clamp(ev.payload.pse-composite, 50000, 120000),
          bankPSE-Index: clamp(ev.payload.bankPSE-Index, 25000, 80000),
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
    } catch {
      // Root cause must not collapse UI: revert to reconnecting and try again.
      this.setConnectionStatus("reconnecting");
      this.triggerReconnect("onEvent_exception");
    }
  }
}
