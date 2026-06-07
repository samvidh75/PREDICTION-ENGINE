# TRACK-34 AGENT-5: Feature Regeneration
**Generated:** 2026-06-06T18:39:26.581Z

## Target
Rebuild `feature_snapshots` from price history + financial history.

## Features Generated (by FeatureEngine)

| Category | Features | Source Data |
|----------|----------|-------------|
| Momentum | ROC, RSI, MACD, Stochastic | daily_prices |
| Volatility | ATR, Historical Vol, Beta | daily_prices |
| Returns | 1M, 3M, 6M, 1Y returns | daily_prices |
| Moving Averages | MA crosses, MA trends | daily_prices |
| Relative Strength | vs NIFTY, vs Sector | daily_prices + benchmark |

## Pipeline Logic

`populate-real-universe.ts` calls `FeatureEngine.calculateAndStoreFeatures(symbol)` after populating `daily_prices`.

## Blockers

- `daily_prices` has 0 rows → FeatureEngine has no input
- FeatureEngine reads from `daily_prices` via SQL queries
- Without price data, no features can be generated

## Verdict

**INSUFFICIENT EVIDENCE** — Feature regeneration depends on `daily_prices` which has 0 rows. Pipeline is coded in `src/services/FeatureEngine.ts` but has no input data.
