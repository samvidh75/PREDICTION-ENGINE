# Database Proof — TRACK-19A

**Date:** 2026-06-06

## Row Counts (Post-Pipeline)

| Table | Row Count |
| --- | --- |
| symbols | 509 |
| financial_snapshots | 755 |
| daily_prices | 660575 |
| feature_snapshots | 647925 |
| factor_snapshots | 647925 |

## Real Data Presence

- 15 symbols have real financial snapshots from ProviderCoordinator (Upstox + Screener + Yahoo)
- 15 symbols have real daily prices from YahooProvider
- 15 symbols have real feature snapshots from FeatureEngine (computed from real prices)
- 15 symbols have real factor snapshots from FactorEngine (computed from real financials + features)
- Remaining rows are pre-existing synthetic data from expand-market-coverage.ts

## Real vs Synthetic Row Counts

- Real financials (today's date): undefined
- Real factor snapshots (NIFTY 15): 15
- Synthetic rows (pre-existing): NaN
