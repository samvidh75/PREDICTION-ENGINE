import type {
  MarketConnectionStatus,
  MarketIndexEvent,
  MarketIndexProvider,
  MarketIndexSubscriber,
} from "./MarketIndexProvider";

export class NullMarketIndexProvider implements MarketIndexProvider {
  private status: MarketConnectionStatus = "disconnected";
  private subscribers: Set<MarketIndexSubscriber> = new Set();

  subscribe(fn: MarketIndexSubscriber): () => void {
    this.subscribers.add(fn);

    // Push a deterministic snapshot so UI never renders “blank”.
    fn({
      type: "connection_status",
      at: Date.now(),
      payload: { status: this.status },
    });

    return () => {
      this.subscribers.delete(fn);
    };
  }

  getStatus(): MarketConnectionStatus {
    return this.status;
  }

  start(): void {
    this.setStatus("disconnected");
  }

  stop(): void {
    this.setStatus("disconnected");
  }

  private setStatus(next: MarketConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;

    const ev: MarketIndexEvent = {
      type: "connection_status",
      at: Date.now(),
      payload: { status: next },
    };

    for (const fn of this.subscribers) fn(ev);
  }
}
