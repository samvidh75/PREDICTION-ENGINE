# TRACK-10F — Consumer Audit

## For Each Consumer: FeatureEngine vs TechnicalIndicatorEngine Dependency

---

### 1. intelligence.ts (API Routes)

| Route | Uses FeatureEngine (via feature_snapshots)? | Uses TechnicalIndicatorEngine? | Evidence |
|-------|---------------------------------------------|-------------------------------|----------|
| `GET /api/intelligence/company/:symbol` | YES | **NO** | Line 37: `SELECT * FROM feature_snapshots` |
| `GET /api/intelligence/market` | Indirectly (via MarketIntelligenceEngine) | **NO** | Line 182: `marketIntelligenceEngine.generateMarketReport()` |
| `GET /api/intelligence/discovery/rankings` | **NO** (uses factor_snapshots only) | **NO** | Lines 246-264: factor_snapshots queries only |
| `GET /api/intelligence/watchlist` | **NO** (uses daily_prices + factor_snapshots) | **NO** | Lines 299-340: daily_prices + factor_snapshots |
| `GET /api/company/:symbol/financials` | **NO** (uses financial_snapshots) | **NO** | Line 379: financial_snapshots query |
| `GET /api/company/:symbol/ownership` | **NO** (uses shareholding_patterns) | **NO** | Line 415: shareholding_patterns query |
| `GET /api/company/:symbol/valuation` | **NO** (uses valuation_snapshots + financial_snapshots) | **NO** | Lines 484-530: valuation_snapshots |
| `GET /api/company/:symbol/risks` | YES | **NO** | Line 583: `SELECT volatility, trend_strength, rsi FROM feature_snapshots` |
| `GET /api/company/:symbol/catalysts` | YES | **NO** | Line 657: `SELECT * FROM feature_snapshots` |
| `GET /api/stockstory/:symbol` | YES (primary) | **YES (fallback only)** | Lines 747 + 780-795 |
| `GET /api/company/:symbol/timeline` | **NO** (uses corporate_timeline) | **NO** | Line 854: corporate_timeline query |

**TechnicalIndicatorEngine is used in exactly 1 of 11 routes in intelligence.ts.**

---

### 2. MarketIntelligenceEngine

| Aspect | Detail |
|--------|--------|
| **Uses FeatureEngine?** | YES — reads `feature_snapshots` directly |
| **Uses TechnicalIndicatorEngine?** | **NO** |
| **Evidence** | `MarketIntelligenceEngine.ts:20-21`: `SELECT COUNT(*)... FROM feature_snapshots WHERE trade_date = (SELECT MAX(trade_date) FROM feature_snapshots)` |
| **Import of TIE?** | No import statement |
| **Dependency on TIE removal?** | **NONE** — MarketIntelligenceEngine never interacts with TIE |

---

### 3. FactorEngine

| Aspect | Detail |
|--------|--------|
| **Uses FeatureEngine?** | YES — reads `feature_snapshots` for ALL technical fields |
| **Uses TechnicalIndicatorEngine?** | **NO** |
| **Evidence** | `FactorEngine.ts:54`: `SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date ASC` |
| **Import of TIE?** | No import statement |
| **Dependency on TIE removal?** | **NONE** — FactorEngine reads from DB only |

---

### 4. FeatureImportanceEngine

| Aspect | Detail |
|--------|--------|
| **Uses FeatureEngine?** | YES — reads `feature_snapshots` for 8 feature columns |
| **Uses TechnicalIndicatorEngine?** | **NO** |
| **Evidence** | `FeatureImportanceEngine.ts:19`: `SELECT trade_date, rsi, macd, adx, atr, momentum, volatility, relative_strength, trend_strength FROM feature_snapshots` |
| **Import of TIE?** | No import statement |
| **Dependency on TIE removal?** | **NONE** |

---

### 5. StockStoryEngine

| Aspect | Detail |
|--------|--------|
| **Uses FeatureEngine?** | Indirectly — via `EngineInputs.features` built from `feature_snapshots` |
| **Uses TechnicalIndicatorEngine?** | Indirectly — ONLY when `intelligence.ts` fallback is triggered (uses same `EngineInputs.features` interface) |
| **Evidence** | `StockStoryEngine.ts:48`: `evaluate(inputs: EngineInputs)` — consumes `inputs.features` regardless of source |
| **Import of TIE?** | No import statement |
| **Dependency on TIE removal?** | **NONE** — StockStoryEngine is source-agnostic. It receives whichever features intelligence.ts provides. |

---

### 6. Offline Scripts

| Script | FeatureEngine Usage | TIE Usage | Evidence |
|--------|-------------------|-----------|----------|
| `expand-market-coverage.ts` | YES (calls `featureEngine.calculateAndStoreFeatures()`) | **NO** | Line: `await featureEngine.calculateAndStoreFeatures(stock.symbol)` |
| `run-research-validation.ts` | YES (calls `featureEngine.calculateAndStoreFeatures()`) | **NO** | Line: `await featureEngine.calculateAndStoreFeatures(sym)` |
| `calibrate.ts` | YES (reads `feature_snapshots`) | **NO** | Line 74: `FROM feature_snapshots` |
| `calibrate_v2.ts` | YES (reads `feature_snapshots`) | **NO** | Line 98: `FROM feature_snapshots` |
| `run-explainability-pipeline.ts` | YES (reads `feature_snapshots`) | **NO** | Line 26: `FROM feature_snapshots` |
| `generate-live-report.ts` | YES (reads `feature_snapshots`) | **NO** | Line 31: `FROM feature_snapshots` |
| `run-intelligence-validation.ts` | YES (reads `feature_snapshots`) | **NO** | Line 55: `FROM feature_snapshots` |

---

### 7. React Frontend Components and Pages

| Component/Page | TIE Usage | Evidence |
|---------------|-----------|----------|
| All React components | **NO** | None import TIE |
| All pages | **NO** | None import TIE |
| StockStoryPage.tsx | **NO** (calls API, not engine) | Calls `GET /api/stockstory/:symbol` |

---

## Dependency Matrix Summary

| Consumer | Depends on FeatureEngine | Depends on TechnicalIndicatorEngine | Breaks if TIE removed? |
|----------|-------------------------|-------------------------------------|------------------------|
| `intelligence.ts` (10 routes) | YES | **NO** | **NO** |
| `intelligence.ts` (stockstory route) | YES | YES (fallback only) | **Only if DB empty** |
| `MarketIntelligenceEngine` | YES | **NO** | **NO** |
| `FactorEngine` | YES | **NO** | **NO** |
| `FeatureImportanceEngine` | YES | **NO** | **NO** |
| `StockStoryEngine` | Source-agnostic | Source-agnostic | **NO** |
| `expand-market-coverage.ts` | YES | **NO** | **NO** |
| `run-research-validation.ts` | YES | **NO** | **NO** |
| `calibrate.ts` | YES | **NO** | **NO** |
| `calibrate_v2.ts` | YES | **NO** | **NO** |
| `run-explainability-pipeline.ts` | YES | **NO** | **NO** |
| `generate-live-report.ts` | YES | **NO** | **NO** |
| `run-intelligence-validation.ts` | YES | **NO** | **NO** |
| Frontend (all components) | **NO** (API consumer) | **NO** | **NO** |

---

## Verdict

**No consumer depends on TechnicalIndicatorEngine as its primary data source.** TIE is a secondary/fallback source used by exactly 1 route under exactly 1 condition (cold start). All other consumers rely exclusively on FeatureEngine via `feature_snapshots`. StockStoryEngine is source-agnostic — it accepts whatever `EngineInputs.features` it receives.
