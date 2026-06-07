# Real Data Pipeline — TRACK-18

**Date:** 2026-06-06

## Architecture: Real-Data-Only Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: ProviderCoordinator.getFinancials(symbol)               │
│ ┌──────────────────────┐ ┌──────────────────┐ ┌─────────────┐  │
│ │ UpstoxFundamentals   │→│ ScreenerProvider  │→│ YahooProvider│  │
│ │ (roa, roe, roic,     │ │ (revenueGrowth,   │ │ (eps, beta,  │  │
│ │  pe, pb, evEbitda,   │ │  profitGrowth,    │ │  fcfYield,   │  │
│ │  debtToEquity)       │ │  operatingMargin, │ │  grossMargin)│  │
│ │                      │ │  currentRatio,    │ │              │  │
│ │ Tier 1 - Primary     │ │  dividendYield)   │ │ Tier 3       │  │
│ └──────────────────────┘ │ Tier 2 - Enrich   │ └─────────────┘  │
│                          └──────────────────┘                   │
│                          ProviderCoordinator.mergeFinancialFields│
│                          (No overwrite — Tier 1 > Tier 2 > 3)  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: DB INSERT into financial_snapshots                       │
│ (symbol, period_end, pe_ratio, ..., roa, roe, ..., revenue_gr...)│
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: ProviderCoordinator.getHistory(symbol, "2Y")            │
│ YahooProvider → 500 trading days OHLCV                          │
│ DB INSERT into daily_prices                                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: TechnicalIndicatorEngine.compute(symbol)                │
│ Reads daily_prices → computes RSI, MACD, ADX, ATR, momentum...  │
│ DB INSERT into feature_snapshots                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: FactorEngine.calculateAndStoreFactors(symbol)           │
│ Reads financial_snapshots + feature_snapshots → computes factors│
│ DB INSERT into factor_snapshots                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: Run calibration/validation pipelines                     │
│ calibrate.ts → reads real DB data                               │
│ TRACK-13 → reads real DB data                                   │
│ TRACK-14 → reads real DB data                                   │
│                                                                  │
│ ALL DATA CAME FROM REAL PROVIDERS. ZERO SYNTHETIC.              │
└─────────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

1. **Symbols** must come from MasterCompanyRegistry (verified Indian companies, NOT generate500Stocks())
2. **Financials** must come from ProviderCoordinator chain (Upstox → Screener → Yahoo), NOT Math.random()
3. **Prices** must come from YahooProvider.getHistory(), NOT random-walk generation
4. **Features** must be computed from real prices by TechnicalIndicatorEngine
5. **Factors** must be computed from real financials + features by FactorEngine

## Existing Real-Data Infrastructure (Already Built)

| Component | Status | Ready? |
| --- | --- | --- |
| ProviderCoordinator (4-provider chain) | ✅ Built and tested | Yes |
| UpstoxFundamentalsProvider | ✅ Built, API key in .env | Yes |
| ScreenerProvider | ✅ Built, HTML scraper | Yes |
| YahooProvider (financials + history) | ✅ Built and tested | Yes |
| TechnicalIndicatorEngine | ✅ Built, computes RSI/MACD/ADX/ATR | Yes |
| FactorEngine | ✅ Built, computes quality/growth/value/momentum/risk | Yes |
| MasterCompanyRegistry (verified entries) | ✅ Built, 45 verified companies | Yes |
| DB schema (all 15 tables) | ✅ Built via migrations | Yes |

## What Must Be Built (New Work)

1. **Real-data universe populator** — replaces expand-market-coverage.ts. For each symbol in MasterCompanyRegistry, calls ProviderCoordinator chain, computes features, computes factors. Must handle rate limits (Upstox: ~20 req/min, Screener: ~12 req/min, Yahoo: ~2000/hr).
2. **Symbol universe from verified registry only** — use MasterCompanyRegistry.getAllEntries() for symbols, NOT generate500Stocks().
3. **Upstox ISIN lookup** — UpstoxFundamentalsProvider requires ISIN for financial data. MasterCompanyRegistry contains ISINs for verified entries.

## Real-Data Pipeline Not Yet Built

There is no script that:
- Takes verified symbols from MasterCompanyRegistry
- Calls ProviderCoordinator.getFinancials() for each
- Calls ProviderCoordinator.getHistory() for each
- Runs FeatureEngine + FactorEngine
- Stores results in DB

This is the missing piece between "having providers that work" and "having a real-data calibration universe."
