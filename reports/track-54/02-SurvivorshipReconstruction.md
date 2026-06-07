# Agent B — Survivorship Bias Reconstruction

## Verdict: FAIL — Cannot reconstruct historical universe from 30 surviving stocks alone. Survivorship bias remains. Real alpha is lower than reported.

### Current State
- **Universe**: 30 stocks — all survivors
- **Missing**: delisted, merged, bankrupt, NIFTY-removed
- **Alpha distortion**: Estimated +100-200 bps annual false alpha

### What We Know
The 30 stocks in quality_registry are current NIFTY 100 constituents. Any companies that were removed from NIFTY during 2019-2025 (due to bankruptcy, merger, delisting, or index rebalancing) are EXCLUDED. Their negative returns are invisible to the backtest.

### What We Need
- Historical NIFTY 100 constituent lists (quarterly, 2019-2025)
- ISIN/symbol mappings for delisted companies
- Historical price data for removed constituents (where available)

### Impact on Alpha Claims
- The 69.8% 365d hit rate is computed on survivors only
- True hit rate (including removed constituents) is unknown but LOWER
- All SSI hit rates should be considered UPPER BOUNDS on true performance
