# F4 — Existing Data Plane Audit

## Current Provider Priority Order (Financials)

Tier 1: UpstoxFundamentalsProvider (primary Indian fundamentals)
Tier 2: YahooProvider (price/volume only)

ScreenerProvider is QUARANTINED — throws on construction.
Moneycontrol does not exist anywhere in the codebase.

## Current Provider Interfaces

| Interface | File | Methods |
|-----------|------|---------|
| `FinancialProvider` | `FinancialProvider.ts` | `getFinancials(symbol)` |
| `PriceProvider` | `PriceProvider.ts` | `getQuote(symbol)` |
| `HistoricalProvider` | `HistoricalProvider.ts` | `getHistory(symbol, range?)` |
| `MetadataProvider` | `MetadataProvider.ts` | `getMetadata(symbol)` |
| `NewsProvider` | `NewsProvider.ts` | `getNews(symbol)` |
| `DataProvider` | `backend/data/providers/types.ts` | `fetchPrices()`, `fetchFundamentals()` |

## Broker Usage Pattern

Every outbound provider call routes through `getSharedProviderRequestBroker().execute(...)`:
- `IndianMarketProvider` → broker `.execute('indianapi', ...)`
- `YahooProvider` → broker `.execute('yahoo', ...)`
- `UpstoxFundamentalsProvider` → broker `.execute('upstox', ...)`
- `GoogleNewsRssProvider` → broker `.execute('google-news', ...)`

Broker provides: single-flight coalescing, quota enforcement, cache (fresh/stale/negative), error classification, circuit-breaker bypass, exponential backoff.

## Existing Database Schema

### `financial_snapshots` (canonical — from 001+005+006+008b+009+012)
Columns: symbol, snapshot_date, period_end, pe_ratio, pb_ratio, eps, dividend_yield, beta, free_float, roe, roic, gross_margin, operating_margin, net_margin, debt_to_equity, current_ratio, revenue_growth, profit_growth, eps_growth, fcf_growth, ev_ebitda, fcf_yield, roa, market_cap, roce

### `daily_prices` (from 001+015)
Columns: symbol, trade_date, open, high, low, close, adjusted_close, volume, dividends, stock_splits, source, quality_score, ingested_at

### `feature_snapshots` (from 002+011)
Columns: symbol, trade_date, rsi, macd, macd_signal, macd_histogram, adx, atr, bollinger_width, momentum, volatility, relative_strength, moving_average_distance, trend_strength

### `factor_snapshots` (from 002+011)
Columns: symbol, trade_date, quality_factor, value_factor, growth_factor, momentum_factor, risk_factor, sector_strength_factor, factor_score, explanations

### `prediction_registry` (from 008+011)
Columns: id, symbol, prediction_date, ranking_score, classification, confidence_score, confidence_level, quality_score, growth_score, value_score, momentum_score, risk_score, sector_score, price_at_prediction, benchmark_level, prediction_horizon, validation_status, validated_at, future_return, benchmark_return, alpha, created_at, created_by

Additional tables: shareholding_patterns, valuation_snapshots, corporate_timeline, news_articles, provider_logs, master_security_registry, financial_statements, data_anomalies, provider_health_metrics, ingestion_runs, rejected_market_records, prediction_input_lineage, scoring_runs, data_completeness_metrics, prediction_registry_quarantine

## Fields Required by Scoring Pipelines

### StockStory Engine (`src/stockstory/types.ts`)
20 fields: peRatio, pbRatio, eps, dividendYield, beta, marketCap, freeFloat, fcfYield, evEbitda, roa, roe, roic, debtToEquity, currentRatio, revenueGrowth, profitGrowth, epsGrowth, fcfGrowth, grossMargin, operatingMargin

### `scoreEngine.ts` (deprecated Pipeline B)
Uses: roe, roa, operatingMargin, netMargin, debtToEquity, revenueGrowth, earningsGrowth, peRatio, pbRatio

### `PredictionFactory.ts` (authoritative Pipeline A)
Uses: peRatio, pbRatio, eps, dividendYield, beta, marketCap, freeFloat, fcfYield, evEbitda, roa, roe, roic, debtToEquity, currentRatio, revenueGrowth, profitGrowth, epsGrowth, fcfGrowth, grossMargin, operatingMargin

## `DatabaseSnapshotProvider.fetchFundamentals()` — Fields Read
pe_ratio, pb_ratio, eps, roe, roa, debt_to_equity, revenue_growth, profit_growth (as earnings_growth), operating_margin

## Missing or Inconsistently Propagated Fields

| Field | In financial_snapshots? | In REQUIRED_SCORING_FIELDS? | In DBSnapshotProvider? | In PredictionFactory? |
|-------|------------------------|----------------------------|----------------------|----------------------|
| peRatio | ✅ pe_ratio | ✅ | ✅ | ✅ |
| pbRatio | ✅ pb_ratio | ✅ | ✅ | ✅ |
| eps | ✅ | ✅ | ✅ | ✅ |
| dividendYield | ✅ dividend_yield | ✅ | ❌ | ✅ |
| beta | ✅ | ✅ | ❌ | ✅ |
| marketCap | ✅ market_cap | ✅ | ❌ | ✅ |
| freeFloat | ✅ free_float | ❌ | ❌ | ✅ |
| fcfYield | ✅ fcf_yield | ✅ | ❌ | ✅ |
| evEbitda | ✅ ev_ebitda | ✅ | ❌ | ✅ |
| **roa** | ✅ | **❌** | ✅ | ✅ |
| roe | ✅ | ✅ | ✅ | ✅ |
| roic | ✅ | ✅ | ❌ | ✅ |
| debtToEquity | ✅ debt_to_equity | ✅ | ✅ | ✅ |
| currentRatio | ✅ current_ratio | ✅ | ❌ | ✅ |
| revenueGrowth | ✅ revenue_growth | ✅ | ✅ | ✅ |
| profitGrowth | ✅ profit_growth | ✅ | ❌ | ✅ |
| epsGrowth | ✅ eps_growth | ✅ | ❌ | ✅ |
| fcfGrowth | ✅ fcf_growth | ✅ | ❌ | ✅ |
| grossMargin | ✅ gross_margin | ✅ | ❌ | ✅ |
| operatingMargin | ✅ operating_margin | ✅ | ✅ | ✅ |
| netMargin | ✅ net_margin | ❌ | ❌ | ✅ (in scoreEngine only) |

## Duplicate Scoring Paths

| Path | Class | created_by | Status |
|------|-------|-----------|--------|
| Pipeline A | PredictionFactory → StockStoryEngine | `DailyPredictionCapture` | Authoritative — used by scheduler |
| Pipeline B | scoreEngine → scoreSnapshot | `ManualSnapshot` | **Deprecated** — for manual use only |

Both write to `prediction_registry`. The audit confirms Pipeline A is the production path.

## Files That Must Change

| File | Change |
|------|--------|
| `src/services/providers/ProviderCoordinator.ts` | Add Screener + Moneycontrol tiers; add `roa` to REQUIRED_SCORING_FIELDS |
| `src/services/providers/ScreenerProvider.ts` | Replace throwing stub with authorized adapter |
| `src/backend/data/providers/DatabaseSnapshotProvider.ts` | Read all 20+ scoring fields from financial_snapshots |
| `src/backend/data/providers/types.ts` | Extend FundamentalSnapshot with all fields |
| `scripts/ingest-fundamentals.ts` | Route through authorized providers |
| `package.json` | Add ingestion + audit scripts |

## Files That Must Remain Untouched

| File | Reason |
|------|--------|
| `src/predictions/PredictionFactory.ts` | Already reads financials correctly; no change needed |
| `src/stockstory/StockStoryEngine.ts` | Engine contract stable; no change needed |
| `src/providers/yfinance/*` | Unrelated to financial fundamentals |
| `src/db/migrations/001-015` | No destructive operations allowed |
| `src/backend/web/routes/*` | API layer unchanged |
| `render.yaml`, `vercel.json` | Deployment config unchanged |
| `.env` | Never committed |
