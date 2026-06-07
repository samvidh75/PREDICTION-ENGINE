# Agent B — NIFTY100 Population Engine

## Verdict: 30/100 (30%)

## Coverage by Table
| Table | Symbols | Status |
|-------|---------|--------|
| quality_registry | 30 | ❌ NEED 70 more |
| daily_prices | 30 | ⚠ 70 gap |
| factor_snapshots | 30 | ⚠ 70 gap |
| feature_snapshots | 30 | ⚠ 70 gap |
| financial_snapshots | 30 | ⚠ 70 gap |
| prediction_registry | 30 | ⚠ 70 gap |

## Date Ranges
- daily_prices: 2021-06-07 to 2026-06-05 (~5 years)
- factor_snapshots: 2021-08-17 to 2026-06-05

## Current Universe (30 symbols)
- **ASIANPAINT.NS**: 1,238 prices, PE=58.1, ROE=21.8
- **AXISBANK.NS**: 1,238 prices, PE=15, ROE=13.2
- **BAJAJFINSV.NS**: 1,238 prices, PE=27.4, ROE=13.2
- **BAJFINANCE.NS**: 1,238 prices, PE=28.8, ROE=18.2
- **BHARTIARTL.NS**: 1,238 prices, PE=38.2, ROE=21.9
- **COALINDIA.NS**: 1,238 prices, PE=9.36, ROE=28.5
- **GRASIM.NS**: 1,238 prices, PE=41.4, ROE=5.05
- **HCLTECH.NS**: 1,238 prices, PE=18, ROE=24
- **HDFCBANK.NS**: 1,238 prices, PE=15.1, ROE=13.8
- **HINDUNILVR.NS**: 1,238 prices, PE=32.7, ROE=31
- **ICICIBANK.NS**: 1,238 prices, PE=16.7, ROE=16.1
- **INFY.NS**: 1,238 prices, PE=16.2, ROE=31.9
- **ITC.NS**: 1,238 prices, PE=16.8, ROE=29.3
- **JSWSTEEL.NS**: 1,238 prices, PE=34.5, ROE=10.1
- **KOTAKBANK.NS**: 1,238 prices, PE=19.7, ROE=11.2
- **LT.NS**: 1,238 prices, PE=33.2, ROE=15.9
- **MARUTI.NS**: 1,238 prices, PE=28, ROE=14.4
- **NESTLEIND.NS**: 1,238 prices, PE=78.5, ROE=74.3
- **NTPC.NS**: 1,238 prices, PE=13, ROE=14
- **ONGC.NS**: 1,238 prices, PE=7.99, ROE=11.7
- **POWERGRID.NS**: 1,238 prices, PE=16.7, ROE=16.5
- **RELIANCE.NS**: 1,238 prices, PE=22.4, ROE=8.91
- **SBIN.NS**: 1,238 prices, PE=10.8, ROE=15.4
- **SUNPHARMA.NS**: 1,238 prices, PE=34.3, ROE=16
- **TATASTEEL.NS**: 1,238 prices, PE=22.8, ROE=11.7
- **TCS.NS**: 1,238 prices, PE=15.2, ROE=51.8
- **TECHM.NS**: 1,238 prices, PE=29.1, ROE=17.6
- **TITAN.NS**: 1,238 prices, PE=73.5, ROE=37.7
- **ULTRACEMCO.NS**: 1,238 prices, PE=38.9, ROE=11.2
- **WIPRO.NS**: 1,238 prices, PE=15.8, ROE=15.5

## Missing 70 Symbols — Action Plan
1. Get NIFTY 100 constituent list from NSE website
2. Scrape quality data via Screener.in for each missing symbol
3. Backfill 5 years daily_prices via yfinance Python bridge
4. Regenerate factor_snapshots and feature_snapshots
5. Populate prediction_registry with factor data

## UniverseExpansionService.ts (to create)
```typescript
export class UniverseExpansionService {
  async expandTo(targetCount: number): Promise<ExpansionResult>;
  async addSymbols(symbols: string[]): Promise<void>;
  async backfillPrices(symbol: string, years: number): Promise<void>;
  async verifyCoverage(): Promise<CoverageReport>;
}
```

## Blockers
1. NIFTY 100 constituent list needed
2. yfinance rate limits for 70 symbols × 5 years of prices
3. Screener.in scraping needed for fundamental data
