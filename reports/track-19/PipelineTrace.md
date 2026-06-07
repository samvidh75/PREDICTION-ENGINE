# TRACK-19 — Phase 1: Complete Pipeline Trace

## PipelineTrace: ProviderCoordinator → StockStory Rankings

---

## 1. OVERVIEW

The StockStory ranking pipeline flows through 6 distinct stages:

```
ProviderCoordinator
  → financial_snapshots (DB table)
  → daily_prices (DB table)
  → feature_snapshots (DB table)  [FeatureEngine]
  → factor_snapshots (DB table)   [FactorEngine]
  → StockStory rankings           [StockStoryEngine]
```

---

## 2. STAGE-BY-STAGE TRACE

### Stage 0: ProviderCoordinator — Data Acquisition

**File:** `src/services/providers/ProviderCoordinator.ts` (line 49-86)

**Inputs:**
- Symbol (e.g., "RELIANCE")
- Provider chain configuration

**Outputs:**
- `StockQuote` (via `getQuote()`)
- `CompanyMetadata` (via `getMetadata()`)
- `HistoricalPoint[]` (via `getHistory()`) — OHLCV candles
- `FinancialSnapshot` (via `getFinancials()`) — financial ratios

**Storage:**
- Not directly persisted — `getFinancials()` and `getHistory()` return in-memory objects that external scripts write to DB tables.

**Provider Chain:**

| Tier | Provider | Purpose | Source |
|------|----------|---------|--------|
| 1 | UpstoxFundamentalsProvider | Primary financials (PE, PB, ROE, ROA, ROIC, EV/EBITDA, D/E) | `src/services/providers/UpstoxFundamentalsProvider.ts` |
| 2 | ScreenerProvider | Enrichment (revenueGrowth, profitGrowth, operatingMargin, currentRatio, dividendYield) | `src/services/providers/ScreenerProvider.ts` |
| 3 | FinnhubProvider | Fallback financials (eps, beta, fcfYield, grossMargin) | `src/services/providers/FinnhubProvider.ts` |
| 4 | YahooProvider | Historical prices, quote, metadata (no fundamentals — v10 blocked) | `src/services/providers/YahooProvider.ts` |

**Execution Trigger:**
- On-demand via `populate-real-universe.ts` (new pipeline)
- On-demand via `run-research-validation.ts` (research pipeline, 7 symbols only)
- Synthetic via `expand-market-coverage.ts` (FORBIDDEN for TRACK-19)

**Merge Logic (ProviderCoordinator.ts lines 185-220):**
- `invokeFinancialsMerge()` iterates providers in tier order
- UpstoxFundamentalsProvider can write: peRatio, pbRatio, roe, roa, roic, evEbitda, debtToEquity, totalAssets, totalLiabilities, totalEquity
- ScreenerProvider can ONLY fill missing: revenueGrowth, profitGrowth, epsGrowth, fcfGrowth, operatingMargin, currentRatio, dividendYield, bookValue, marketCap
- Finnhub/Yahoo can ONLY fill still-missing: eps, beta, fcfYield, grossMargin
- **NO provider can overwrite a populated field from an earlier tier**

---

### Stage 1: financial_snapshots — Persistence

**Inputs:** `FinancialSnapshot` from `ProviderCoordinator.getFinancials()`

**Populated by:**
- `populate-real-universe.ts` — REAL (lines 119-163)
- `expand-market-coverage.ts` — SYNTHETIC (lines 51-73, FORBIDDEN)
- `run-research-validation.ts` — SYNTHETIC fallback values (lines 91-96, uses hardcoded defaults: peRatio=20, eps=50, dividendYield=1.5, beta=1.0)

**Schema columns:** symbol, period_end, market_cap, pe_ratio, eps, dividend_yield, beta, free_float, fcf_yield, ev_ebitda, roa, roe, roic, debt_to_equity, current_ratio, revenue_growth, profit_growth, eps_growth, fcf_growth, gross_margin, operating_margin, pb_ratio

**Outputs:** PostgreSQL table `financial_snapshots`

**Execution Trigger:**
- Called per symbol during `populateSymbol()` in `populate-real-universe.ts` (line 120)

---

### Stage 2: daily_prices — Persistence

**Inputs:** `HistoricalPoint[]` from `ProviderCoordinator.getHistory(symbol, "2Y")`

**Populated by:**
- `populate-real-universe.ts` — REAL from YahooProvider (lines 167-193)
- `expand-market-coverage.ts` — SYNTHETIC `Math.random()` candles (lines 79-122, FORBIDDEN)
- `run-research-validation.ts` — REAL from YahooProvider (lines 76-87) for 7 symbols

**Schema columns:** symbol, trade_date, open, high, low, close, adjusted_close, volume

**Outputs:** PostgreSQL table `daily_prices`

**Execution Trigger:**
- Called per symbol during `populateSymbol()` in `populate-real-universe.ts` (line 169)

---

### Stage 3: feature_snapshots — FeatureEngine

**File:** `src/services/FeatureEngine.ts` (line 42-254)

**Inputs:**
- `daily_prices` table rows for a given symbol (line 47-56)
- `SELECT AVG((close-open)/open) ... GROUP BY trade_date` — market average for relative strength (line 24-30)

**Computed Features (all from price data ONLY):**

| Feature | Period/Params | Source in code |
|---------|---------------|----------------|
| RSI | 14-period | Lines 74-85 |
| MACD | (12, 26, 9) | Lines 88-97 |
| MACD Signal | 9-period EMA of MACD | Line 93-97 |
| MACD Histogram | MACD - Signal | Line 96 |
| ADX | 14-period | Lines 115-152 |
| ATR | 14-period | Lines 101-113 |
| Bollinger Width | 20-period, 2σ | Lines 155-160 |
| Momentum | 10-day rate of change | Lines 163-165 |
| Volatility | 20-day daily return stddev annualized | Lines 168-178 |
| Relative Strength | Asset return - market avg return | Lines 181-187 |
| Moving Average Distance | (Close - SMA50) / SMA50 | Lines 190-194 |
| Trend Strength | (EMA20 - EMA50)/Close × (1 + ADX/100) | Lines 197-203 |

**Outputs:** PostgreSQL table `feature_snapshots`

**Storage method:** `calculateAndStoreFeatures()` (line 42) — writes each date's features via UPSERT (lines 208-233)

**Dependencies:**
- Requires `daily_prices` table to be populated first
- Requires at least 2 rows of price data (line 54)
- Minimum data for full calculations: ~50 trading days (for SMA50, ADX warmup)

**Execution Trigger:**
- Called per symbol in `populate-real-universe.ts` (line 201)
- Called per symbol in `expand-market-coverage.ts` (line 142, FORBIDDEN)
- Called per symbol in `run-research-validation.ts` (line 100)

**Data provenance:** FeatureEngine is **purely mathematical** — it computes derived values from raw OHLCV prices. If daily_prices contain synthetic data, features become synthetic. If daily_prices contain real Yahoo data, features are REAL (provider-derived, mathematically transformed).

---

### Stage 4: factor_snapshots — FactorEngine

**File:** `src/services/FactorEngine.ts` (line 57-184)

**Inputs:**
- `feature_snapshots` table (line 63-66)
- `daily_prices` table (line 68-70)
- `symbols` table (sector lookup, line 72-75)
- `financial_snapshots` table (line 77-79)
- Sector momentum map from `daily_prices` (line 26-38)

**Computed Factors:**

| Factor | Formula Source | Lines |
|--------|---------------|-------|
| qualityFactor | PE stability (40%) + Dividend yield (30%) + RSI range (30%) | 97-102 |
| valueFactor | PE value (50%) + Dividend yield value (20%) + MA distance value (30%) | 106-111 |
| growthFactor | Trend strength (60%) + Momentum (40%) | 115-117 |
| momentumFactor | RSI (30%) + MACD histogram (30%) + Price momentum (40%) | 121-124 |
| riskFactor | Volatility risk (40%) + Beta risk (40%) + ATR risk (20%) | 128-131 |
| sectorStrengthFactor | Sector average return normalized (50 + sectorReturn × 1000) | 135-136 |
| factorScore | Equal-weighted average of all 6 factors | 141-142 |

**Outputs:** PostgreSQL table `factor_snapshots`

**Dependencies (CRITICAL):**
- Requires `feature_snapshots` (Stage 3)
- Requires `financial_snapshots` (Stage 1) — for PE ratio, dividend yield, beta
- Requires `symbols.sector` — for sector momentum calculation
- Requires `daily_prices` — for sector momentum aggregation

**Execution Trigger:**
- Called per symbol in `populate-real-universe.ts` (line 212)
- Called per symbol in `expand-market-coverage.ts` (line 144, FORBIDDEN)
- Called per symbol in `run-research-validation.ts` (line 102)

**Data provenance:** FactorEngine **derives** factors from features, financials, and sector data. If features come from real Yahoo prices AND financials come from providers, then factors are 100% real-data-derived. If either source is synthetic, factors become invalid.

---

### Stage 5: StockStory Rankings — StockStoryEngine

**File:** `src/stockstory/StockStoryEngine.ts` (line 44-150)

**Inputs:** `EngineInputs` object containing:
- `features` (from `feature_snapshots` table)
- `factors` (from `factor_snapshots` table)
- `financials` (from `financial_snapshots` table)
- `sector` (from `symbols` table)
- `historical` (optional trend data)

**Engine Pipeline:**

| Step | Engine | Input Data | Output |
|------|--------|-----------|--------|
| 1 | GrowthEngine | financials.revenueGrowth, epsGrowth, fcfGrowth, profitGrowth | growth.score (0-100) |
| 2 | QualityEngine | financials.roe, roa, roic, grossMargin, operatingMargin | quality.score (0-100) |
| 3 | StabilityEngine | financials.debtToEquity, currentRatio, fcfYield | stability.score (0-100) |
| 4 | MomentumEngine | features.momentum, features.trendStrength, features.rsi | momentum.score (0-100) |
| 5 | ValuationEngine | financials.peRatio, pbRatio, evEbitda, fcfYield | valuation.score (0-100) |
| 6 | RiskEngine | features.volatility, financials.debtToEquity, accounting flags | risk.score (0-100) |
| 7 | AccountingEngine | financial cash flow quality checks | accounting score |
| 8 | Penalty Framework | Accounting, Debt, Volatility, Governance checks | penalties |
| 9 | ConfidenceEngine | Data completeness, signal agreement, risk consistency | confidence level |

**Output:** `StockStoryOutput` with healthScore, classification, confidence, growth, quality, stability, valuation, momentum, risk, narrative, and penalty details.

**Execution Trigger:**
- API endpoint `/api/stockstory/:symbol` reads from DB and runs through `StockStoryEngine.evaluate()`
- `generate-deliverables.ts` runs `StockStoryEngine.evaluate()` with synthetic `buildInputs()` — FORBIDDEN
- On-demand via any caller

---

## 3. DATA LINEAGE SUMMARY

```
ProviderCoordinator (Yahoo v8 API)
  │
  ├─► getHistory(symbol, "2Y") ──► HistoricalPoint[]
  │                                  │
  │                                  ▼
  │                          INSERT INTO daily_prices
  │                                  │
  │                                  ▼
  │                          FeatureEngine.calculateAndStoreFeatures()
  │                                  │
  │                                  ▼
  │                          INSERT INTO feature_snapshots
  │                                  │
  ├─► getFinancials(symbol) ──► FinancialSnapshot
  │                               │
  │                               ▼
  │                       INSERT INTO financial_snapshots
  │                               │
  │                               ├──────────────────────┐
  │                               ▼                      ▼
  │                     FactorEngine                FactorEngine
  │                     .calculateAndStoreFactors()  (reads financial_snapshots
  │                               │                 + feature_snapshots
  │                               ▼                 + sector data)
  │                     INSERT INTO factor_snapshots
  │                               │
  │                               ▼
  │                     StockStoryEngine.evaluate()
  │                               │
  │                               ▼
  │                     StockStoryOutput (rankings)
  │
  └─► getMetadata(symbol) ──► INSERT INTO symbols
```

---

## 4. EXECUTION FLOW (REAL PATH ONLY)

The only real-data execution flow that populates all tables:

1. **`populate-real-universe.ts`** (new script for TRACK-19)
   - Reads `MasterCompanyRegistry` → gets all 505 symbols
   - For each symbol:
     a. Inserts symbol metadata into `symbols` table
     b. Calls `coordinator.getFinancials(symbol)` → writes to `financial_snapshots`
     c. Calls `coordinator.getHistory(symbol, "2Y")` → writes to `daily_prices`
     d. Calls `featureEngine.calculateAndStoreFeatures(symbol)` → writes to `feature_snapshots`
     e. Calls `factorEngine.calculateAndStoreFactors(symbol)` → writes to `factor_snapshots`
   - Writes coverage reports to `reports/track-19/`

2. **`run-research-validation.ts`** (existing, 7 symbols only)
   - Same flow but only for RESEARCH_SYMBOLS = [RELIANCE, TCS, INFY, HDFCBANK, HAL, BEL, IRFC]
   - **Note:** Financial snapshots are hardcoded fallback values (peRatio=20, eps=50, dividendYield=1.5, beta=1.0) — NOT real provider financials

---

## 5. FORBIDDEN SCRIPTS (SYNTHETIC)

| Script | What's synthetic | Lines |
|--------|-----------------|-------|
| `expand-market-coverage.ts` | ALL daily prices (`Math.random()` candles for 505 stocks × 1250 days) | 62-66 |
| `expand-market-coverage.ts` | ALL financial snapshots (`Math.random()` PE, EPS, margins) | 51-73 |
| `expand-market-coverage.ts` | Features/Factors (computed from synthetic prices+financials) | 140-144 |
| `generate-deliverables.ts` | ALL EngineInputs (`bounded(seed)` pseudo-random) | 28-91 |
| `run-research-validation.ts` | Financial defaults (hardcoded, not provider-derived, lines 91-96) | 91-96 |

---

**Conclusion:** The pipeline exists and is fully traceable. `populate-real-universe.ts` is the ONLY script (besides `run-research-validation.ts` for 7 symbols) capable of populating the full pipeline with provider-derived data.

- **`ProviderCoordinator → daily_prices`** : ✅ Real (Yahoo v8 API — price history only)
- **`ProviderCoordinator → financial_snapshots`** : ⚠️ Real from Upstox/Screener/Finnhub BUT requires Upstox OAuth token (user-bound), Screener.in scraping, and Finnhub API key
- **`FeatureEngine → feature_snapshots`** : ✅ Real-derived (pure math from real prices)
- **`FactorEngine → factor_snapshots`** : ⚠️ Real-derived IF financials come from providers; synthetic if financials are defaults
