# TRACK-18 — Synthetic Source Inventory

## Q1: All Synthetic Data Generators

### 1. `expand-market-coverage.ts` — **SYNTHETIC (100%)**

| Aspect | Detail |
|--------|--------|
| **File** | `src/scripts/expand-market-coverage.ts` |
| **Synthetic mechanism** | `Math.random()` generates all OHLCV candles for 500 stocks × ~1250 days |
| **What's synthetic** | Every open, high, low, close, volume for every stock for every day. Features (RSI, MACD, etc.) computed from synthetic prices. Factors computed from synthetic features. |
| **What's real** | Stock symbols and metadata from `generate500Stocks()` (505 real Indian tickers) |
| **Classification** | **PRODUCTION REACHABLE** — if run, populates the production DB with synthetic data |
| **Used by** | DB population (feature_snapshots, factor_snapshots, daily_prices, financial_snapshots) |

```typescript
// Line ~62: Synthetic candle generation
let price = 100.0 + Math.random() * 200;
for (const date of dates) {
  const change = (Math.random() - 0.49) * 2.0; // slight upward bias
  price = Math.max(1.0, price + change);
  // ... open, high, low, close all derived from Math.random()
}
```

---

### 2. `generate-deliverables.ts` — **SYNTHETIC (100%)**

| Aspect | Detail |
|--------|--------|
| **File** | `src/scripts/generate-deliverables.ts` |
| **Synthetic mechanism** | `bounded(seed, min, max)` function — deterministic pseudo-random from symbol hash |
| **What's synthetic** | ALL EngineInputs: features (RSI, MACD, ADX, etc.), factors (quality, value, growth, etc.), financials (PE, ROE, D/E, etc.), historical data |
| **What's real** | Stock symbols from `MasterCompanyRegistry` (real tickers) |
| **Classification** | **CALIBRATION** — generates Top20, Bottom20, FactorAttribution, PercentileValidation reports |
| **Used by** | EngineCalibrationReport.md, PercentileValidationReport.md, Top20Report.md, Bottom20Report.md, FactorAttributionReport.md |

```typescript
// Line ~35: All data is synthetic
function bounded(seed: number, min: number, max: number): number {
  const span = max - min;
  return Number((min + (seed % 1000) / 1000 * span).toFixed(3));
}

// Every field uses bounded():
rsi: bounded(seed + 11, 35, 68),      // Fake RSI
roe: bounded(seed + 131, 0.05, 0.35), // Fake ROE
peRatio: bounded(seed + 89, 8, 45),   // Fake PE
```

---

### 3. `generate500Stocks.ts` — **REAL LIST, ALL DATA SYNTHETIC**

| Aspect | Detail |
|--------|--------|
| **File** | `src/services/stocks/generate500Stocks.ts` |
| **What's real** | 505 Indian company tickers with correct names, sectors, and industries |
| **What's synthetic** | All financial data, price data, features, and factors for these tickers come from `expand-market-coverage.ts` (synthetic candles) or `generate-deliverables.ts` (synthetic EngineInputs) |
| **Classification** | **REAL SYMBOLS, SYNTHETIC DATA** |

---

### 4. `SectorDistributionEngine.ts` — **HARDCODED REFERENCE DATA**

| Aspect | Detail |
|--------|--------|
| **File** | `src/stockstory/analytics/SectorDistributionEngine.ts` |
| **Synthetic mechanism** | Static hardcoded percentile distributions for 7 sectors × 13 metrics |
| **Claimed source** | "Indian market empirical reference data (2024-2025)" |
| **Actual implementation** | Hardcoded `{ p10, p25, p50, p75, p90 }` objects — no DB query, no live data |
| **Classification** | **HARDCODED REFERENCE** — not synthetic per se, but not live either. Claims to be empirical. |

```typescript
// Lines 30-38: Example Banking distribution
BANKING: {
  roa: { p10: 0.002, p25: 0.004, p50: 0.008, p75: 0.011, p90: 0.014 },
  roe: { p10: 0.02, p25: 0.06, p50: 0.11, p75: 0.15, p90: 0.18 },
  debtToEquity: { p10: 2.0, p25: 4.0, p50: 7.0, p75: 10.0, p90: 14.0 },
  // ...
}
```

---

### 5. `run-research-validation.ts` — **REAL PROVIDER DATA**

| Aspect | Detail |
|--------|--------|
| **File** | `src/scripts/run-research-validation.ts` |
| **Synthetic mechanism** | **NONE** — fetches real data from YahooProvider via ProviderCoordinator |
| **What's real** | 5-year price history, metadata for 7 symbols from Yahoo API |
| **Classification** | **REAL** — fetches live provider data |
| **Used by** | Research validation pipeline (ML benchmarks, factor backtests, feature importance) |

---

### 6. Miscellaneous Math.random Usage

| Location | Context | Classification |
|----------|---------|---------------|
| Financial snapshots in `expand-market-coverage.ts` | Synthetic PE, EPS, margins, D/E | **PRODUCTION REACHABLE** |
| ISIN generation in `expand-market-coverage.ts` | `INE${Math.random()...}` — fake ISIN codes | **PRODUCTION REACHABLE** |

---

## Inventory Summary

| Generator | Synthetic % | Real % | Classification |
|-----------|-------------|--------|----------------|
| `expand-market-coverage.ts` | **100%** | 0% (uses real ticker list but all data synthetic) | **PRODUCTION REACHABLE** |
| `generate-deliverables.ts` | **100%** | 0% | **CALIBRATION** |
| `generate500Stocks.ts` | 0% (symbols real) | 100% (symbols only) | **REAL SYMBOLS** |
| `SectorDistributionEngine.ts` | 0% | 0% (hardcoded reference) | **HARDCODED REFERENCE** |
| `run-research-validation.ts` | 0% | 100% (provider data) | **REAL** |
| `calibrate.ts` / `calibrate_v2.ts` | **100%** (reads synthetic DB) | 0% | **CALIBRATION (synthetic input)** |

**Critical finding:** The `EngineCalibrationReport.md` displayed to users and used for TRACK-13/14 calibration was generated from `generate-deliverables.ts` which uses 100% synthetic data. The top 20, bottom 20, sector distributions, and factor attributions in that report are mathematically unsound.
