export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

export type MarketState = {
  at: number;

  nifty: number;
  sensex: number;
  bankNifty: number;

  vix: number; // proxy for volatility environment
  breadthPct: number; // 35..72 (synthetic for now)

  fiiDiiTone: number; // -1.6..1.6 (synthetic for now)
};
