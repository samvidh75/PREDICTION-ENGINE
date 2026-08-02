declare global {
  interface Window {
    __ss_market_diag_buffer?: Array<unknown>;
  }
}

export type MarketDiagEvent =
  | { type: "connection_status"; at: number; status: string }
  | { type: "watchdog_trigger"; at: number; silenceMs: number }
  | { type: "reconnect_attempt"; at: number; attempt: number; reason: string; backoffMs: number }
  | { type: "reconnect_give_up"; at: number; attempts: number }
  | { type: "reconnect_success_signal"; at: number; status: string }
  | { type: "emit_publish"; at: number; conn: string; batched: boolean };

export function pushMarketDiag(ev: MarketDiagEvent, maxEntries = 120): void {
  if (typeof window === "undefined") return;

  const g = window as Window;
  if (!g.__ss_market_diag_buffer) g.__ss_market_diag_buffer = [];
  g.__ss_market_diag_buffer.push(ev);

  if (g.__ss_market_diag_buffer.length > maxEntries) {
    g.__ss_market_diag_buffer.splice(0, g.__ss_market_diag_buffer.length - maxEntries);
  }
}
