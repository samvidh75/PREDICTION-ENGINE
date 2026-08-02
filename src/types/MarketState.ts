/**
 * Composite market-index snapshot shape used by the client-side simulated
 * market feed (src/services/market/**) — distinct from the market-regime
 * `MarketState` union in src/services/intelligence/marketState.ts, which
 * describes qualitative states ("Stable Expansion", etc.) rather than raw
 * index levels.
 */
export interface MarketState {
  at: number;
  pseiIndex: number;
  pseiComposite: number;
  financialsIndexValue: number;
  vix: number;
  breadthPct: number;
  foreignDomesticFlowTone: number;
}
