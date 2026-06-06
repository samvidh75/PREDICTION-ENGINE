# Synthetic Source Inventory — TRACK-18

**Date:** 2026-06-06

## CRITICAL SYNTHETIC DATA SOURCES (Data Pipeline)

### 1. expand-market-coverage.ts — COMPLETE UNIVERSE DATA GENERATION 🔴

**File:** `src/scripts/expand-market-coverage.ts`
**Severity:** CRITICAL — generates ALL database content

This script generates every row in all 5 core tables:
- `symbols`: 500 symbols from generate500Stocks() (hardcoded registry, acceptable)
- `financial_snapshots`: EVERY financial metric via Math.random() — P/E, ROE, ROIC, revenue growth, profit growth, D/E, gross margin, operating margin, etc. (22 metrics per stock, all synthetic)
- `daily_prices`: ~625,000 rows of random-walk price candles (open/high/low/close/volume)
- `feature_snapshots`: Computed from synthetic daily_prices by FeatureEngine
- `factor_snapshots`: Computed from synthetic financials + features by FactorEngine

**This is the calibration data pipeline. 100% synthetic.**

### 2. generate-deliverables.ts — SYNTHETIC UNIVERSE GENERATOR 🔴

**File:** `src/scripts/generate-deliverables.ts`
**Severity:** CRITICAL — generates rankings from synthetic data

Uses `buildInputs()` function (line 55-109) which generates synthetic EngineInputs via `bounded(seed, min, max)` for:
- All 12 technical features (RSI, MACD, ADX, ATR, momentum, volatility, etc.)
- All 7 factor scores (quality, growth, value, momentum, risk, sectorStrength, factorScore)
- All 20+ financial metrics (PE, PB, EPS, roe, roa, roic, D/E, revenueGrowth, profitGrowth, etc.)
- Historical data (feature history, factor history, price history)

Produces: Top20Report.md, Bottom20Report.md, FactorAttributionReport.md, PercentileValidationReport.md — ALL synthetic.

### 3. calibrate.ts — READS SYNTHETIC DATA FROM DB 🔴

**File:** `src/scripts/calibrate.ts`
**Severity:** HIGH — consumes synthetic data, produces calibration report

Reads from the database which was populated by expand-market-coverage.ts. All 505 companies in EngineCalibrationReport.md had synthetic fundamentals. The calibration conclusions (factor correlations, sector biases, engine score distributions) are VALID for synthetic data but NOT validated against real companies.

### 4. chartData.ts — SYNTHETIC CHART GENERATOR 🟡

**File:** `src/components/charts/chartData.ts`
**Severity:** MEDIUM — generates deterministic synthetic OHLCV for demo/display

`getSyntheticChartSeries(ticker, timeframe)` — generates candidate chart data from a seeded random. Used by:
- CommandResultCard.tsx
- Company52WeekRangeMini.tsx
- IntelligenceMiniChart.tsx

Does NOT feed into the ranking pipeline. Used for UI display only.

### 5. MockDataFetcher.ts — DEMO MOCK DATA 🟡

**File:** `src/components/telemetry/MockDataFetcher.ts`
**Severity:** LOW — mock data for demo/testing only

Contains `MOCK_COMPANIES` with hardcoded telemetry for RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK. Generates synthetic price movement. Does NOT feed into the ranking pipeline.

## NON-DATA Math.random() USAGE (Not Synthetic Data)

| File | Purpose | Severity |
| --- | --- | --- |
| RetryPolicy.ts | Exponential backoff jitter | Not data — operational |
| QueryClientConfig.ts | Cache query jitter | Not data — operational |
| UpstoxOAuthService.ts | PKCE code verifier generation | Not data — security |
| investorState.ts | ID generation | Not data — identifiers |
| watchlistStore.ts | ID generation | Not data — identifiers |

## VERDICT

**100% of calibration ranking data is synthetic.** The entire pipeline from symbols → financials → features → factors → engine scores → reports uses Math.random(). Zero real provider data feeds into any calibration or deliverable generation.
