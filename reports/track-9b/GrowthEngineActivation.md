# TRACK-9B Growth Engine Activation

Generated: 2026-06-05T19:18:17.618Z

## Why GrowthEngine was neutral in TRACK-9A

TRACK-9A built EngineInputs directly from Upstox. UpstoxFundamentalsProvider does not emit revenueGrowth, profitGrowth, epsGrowth, or fcfGrowth. GrowthEngine initializes every missing growth sub-score to 50 and only moves the score when those fields are non-null.

## Runtime trace after TRACK-9B merge refactor

| Symbol | RevenueGrowth | ProfitGrowth | EPSGrowth | FCFGrowth | Sources | Growth score | Commentary |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| RELIANCE | 0.1 | 0.14 | null | null | revenueGrowth:ScreenerProvider, profitGrowth:ScreenerProvider, epsGrowth:MISSING, fcfGrowth:MISSING | 62 | Solid growth across key metrics. Revenue and earnings expansion are tracking above market averages. |
| TCS | 0.05 | 0.08 | null | null | revenueGrowth:ScreenerProvider, profitGrowth:ScreenerProvider, epsGrowth:MISSING, fcfGrowth:MISSING | 54 | Moderate growth profile. Some metrics show expansion while others indicate deceleration. |
| INFY | 0.1 | 0.13 | null | null | revenueGrowth:ScreenerProvider, profitGrowth:ScreenerProvider, epsGrowth:MISSING, fcfGrowth:MISSING | 62 | Solid growth across key metrics. Revenue and earnings expansion are tracking above market averages. |
| HDFCBANK | 0.04 | 0.08 | null | null | revenueGrowth:ScreenerProvider, profitGrowth:ScreenerProvider, epsGrowth:MISSING, fcfGrowth:MISSING | 48 | Moderate growth profile. Some metrics show expansion while others indicate deceleration. |
| ICICIBANK | 0.05 | 0.06 | null | null | revenueGrowth:ScreenerProvider, profitGrowth:ScreenerProvider, epsGrowth:MISSING, fcfGrowth:MISSING | 54 | Moderate growth profile. Some metrics show expansion while others indicate deceleration. |

## Exact null propagation

ProviderCoordinator receives Upstox null/undefined for growth fields, then Screener fills revenueGrowth/profitGrowth where live HTML extraction succeeds. EPSGrowth and FCFGrowth remain null unless Screener extracts them from live rows. No default growth values are inserted.
