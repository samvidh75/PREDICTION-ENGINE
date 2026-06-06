# Table Recovery Plan — TRACK-13A.2

**Date:** 2026-06-06

## Recovery Assessment per Table

### symbols
| Metric | Value |
| --- | --- |
| Recoverable rows | 0 (no cached DB dump) |
| Missing rows | All 505+ |
| Rebuild source | MasterCompanyRegistry (hardcoded in code) + generate500Stocks() — can regenerate symbol universe without API calls |
| Effort | Low — insert script using existing registry data |

### financial_snapshots
| Metric | Value |
| --- | --- |
| Recoverable rows | ~16 symbols have cached Upstox+Screener data |
| Missing rows | 489+ symbols |
| Rebuild source | ProviderCoordinator → UpstoxFundamentalsProvider (Tier 1) + ScreenerProvider (Tier 2) + YahooProvider (Tier 3) |
| Effort | High — 500+ API calls required, rate-limited |
| Upstox load | One request per symbol (ISIN lookup → key-ratios + balance-sheet) |
| Screener load | One HTML scrape per symbol (ScreenerProvider parses screener.in pages) |
| Yahoo load | One request per symbol (YahooProvider.getFinancials) |

### feature_snapshots
| Metric | Value |
| --- | --- |
| Recoverable rows | 5 symbols have Yahoo OHLCV history |
| Missing rows | 500+ symbols |
| Rebuild source | YahooProvider.getHistory() → TechnicalIndicatorEngine.compute() |
| Effort | Very High — requires OHLCV data for each symbol, then RSI/MACD/ADX/ATR computation |
| Required | 1-2 years of daily OHLCV data per symbol for meaningful indicator computation |

### factor_snapshots
| Metric | Value |
| --- | --- |
| Recoverable rows | 0 (factors are computed pipeline outputs, not cached as artifacts) |
| Missing rows | All 505 |
| Rebuild source | FactorEngine requires BOTH financial_snapshots AND feature_snapshots per symbol |
| Effort | Highest — dependent on financial_snapshots AND feature_snapshots being populated first |
| Dependencies | symbols + financial_snapshots + feature_snapshots must be complete |

### daily_prices
| Metric | Value |
| --- | --- |
| Recoverable rows | 5 symbols × ~250 trading days = ~1250 rows from Yahoo history |
| Missing rows | 500+ symbols × 250+ days |
| Rebuild source | YahooProvider.getHistory(range="2Y") per symbol |
| Effort | Very High — ~125,000 rows across 500 symbols |

## Summary

| Table | Recovery % | Primary Blocker |
| --- | --- | --- |
| symbols | 100% from code | None — can regenerate from MasterCompanyRegistry |
| financial_snapshots | ~3% | 489 symbols need fresh Upstox+Screener+Yahoo calls |
| feature_snapshots | ~1% | 500 symbols need OHLCV + indicator computation |
| factor_snapshots | 0% | Depends on financial_snapshots + feature_snapshots |
| daily_prices | ~1% | 500 symbols need 2Y price history |
