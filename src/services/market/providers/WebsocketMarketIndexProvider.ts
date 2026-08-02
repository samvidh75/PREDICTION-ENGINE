import { WebsocketManager, type MarketWebsocketEvent } from "../websocketManager";
import type {
  MarketConnectionStatus,
  MarketIndexEvent,
  MarketIndexProvider,
  MarketIndexSubscriber,
} from "./MarketIndexProvider";

function asMarketConnectionStatus(status: MarketConnectionStatus): MarketConnectionStatus {
  return status;
}

/**
 * WebsocketMarketIndexProvider
 * - adapts existing WebsocketManager into the modular MarketIndexProvider interface
 * - keeps “no fake live data” behavior controlled by VITE_MARKET_SIMULATION in websocketManager
 */
export class WebsocketMarketIndexProvider implements MarketIndexProvider {
  private ws: WebsocketManager;

  constructor(ws?: WebsocketManager) {
    this.ws = ws ?? new WebsocketManager();
  }

  subscribe(fn: MarketIndexSubscriber): () => void {
    const unsub = this.ws.subscribe((ev: MarketWebsocketEvent) => {
      // MarketWebsocketEvent payload shapes match MarketIndexEvent exactly.
      // Only the connection status type name differs, but the string union is identical.
      const next = ev as unknown as MarketIndexEvent;

      if (next.type === "connection_status") {
        next.payload.status = asMarketConnectionStatus(next.payload.status);
      }

      fn(next);
    });

    return unsub;
  }

  getStatus(): MarketConnectionStatus {
    return this.ws.getStatus();
  }

  start(): void {
    this.ws.connect();
  }

  stop(): void {
    this.ws.disconnect();
  }
}
