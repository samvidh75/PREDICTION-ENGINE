import type { MarketState } from "../../../types/MarketState";

export type MarketConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

export type MarketIndexEvent =
  | { type: "market_prices"; at: number; payload: { nifty: number; sensex: number; bankNifty: number } }
  | { type: "market_volatility"; at: number; payload: { vix: number } }
  | { type: "market_breadth"; at: number; payload: { breadthPct: number } }
  | { type: "institutional_flows"; at: number; payload: { fiiDiiTone: number } }
  | { type: "connection_status"; at: number; payload: { status: MarketConnectionStatus } };

export type MarketIndexSubscriber = (ev: MarketIndexEvent) => void;

export type MarketIndexState = MarketState;

export interface MarketIndexProvider {
  subscribe(fn: MarketIndexSubscriber): () => void;
  getStatus(): MarketConnectionStatus;
  start(): void;
  stop(): void;
}
