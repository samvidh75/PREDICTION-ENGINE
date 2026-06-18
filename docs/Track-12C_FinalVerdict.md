# TRACK-12C FINAL VERDICT — Production Scoring Call Graph & Ingestion Audit

## Summary

Track-12C hardens the production scoring call graph by activating three dormant
metrics (ROA, dividend yield, market cap), normalizing all financial inputs at
the ingestion boundary via `isFiniteNumber`, and auditing every data source for
Moneycontrol-level reliability.

### Test Results

| Suite | Status |
|---|---|
| Full regression | **451/451 passed** (60 test files) |
| ScoringIntegrity (GROUP K) | 67/67 passed — new adversarial calibration tests |
| StockStoryEngine | 47/47 passed — updated null ROA expectation |

---

## Changes Made

### 1. Scoring Engine Activation (Track-12 merge)

| Engine | Metric | Weight | Behaviour |
|---|---|---|---|
| `QualityEngine` | `roa` | 2.0 | Output passes through `isFiniteNumber`; `null` propagates as `null` |
| `ValuationEngine` | `dividendYield` | 1.0 | Null → score 50 (excluded from weighted avg) |
| `StabilityEngine` | `marketCap` | 1.0 | Null → score 50; log10 scoring with bounds 1–∞ Cr |

### 2. Numeric Hardening (`isFiniteNumber`)

Applied at-rest in `PredictionFactory` and all 8 engine outputs. Rule:
- `NaN`, `Infinity`, `-Infinity`, `undefined`, non-number types → `null`
- `null` inputs propagate as `null` (no silent conversion to 0)
- Valid finite numbers pass through unchanged

Files modified:
- `src/stockstory/types.ts` — `isFiniteNumber` added
- `src/stockstory/StockStoryEngine.ts` — all 8 engine outputs wrapped
- `src/stockstory/engines/*.ts` — `QualityEngine`, `StabilityEngine`, `ValuationEngine` ROA/dividend/marketCap outputs
- `src/predictions/PredictionFactory.ts` — input-field-level sanitization
- `src/stockstory/__tests__/StockStoryEngine.test.ts` — null ROA test: `null` not `0`
- `src/stockstory/__tests__/ScoringIntegrity.test.ts` — GROUP K calibration tests

### 3. Adversarial Calibration Tests (GROUP K)

| Subgroup | Tests | Scope |
|---|---|---|
| K1 ROA | 10 | Negative, zero, positive, null, NaN, Infinity, weight parity |
| K2 Dividend Yield | 12 | Null, zero, low, healthy, sweet-spot, distress, extreme, NaN, Infinity, confidence |
| K3 Market Cap | 9 | Null, zero, negative, micro/small/mid/large/mega caps, NaN, Infinity, weight dominance |
| K4 Missing data | 2 | All-optional-null, bounded check |

### 4. Ingestion Pipeline Audit

| Provider | Status | Notes |
|---|---|---|
| Upstox Fundamentals API | ✅ Active (Tier 1) | Uses `UPSTOX_ACCESS_TOKEN` from env; reads `localStorage` in browser |
| Yahoo Finance v8 | ✅ Active (prices) | Free, no key; fundamentals blocked (v10 returns 401) |
| IndianAPI.in | ✅ Active (fallback) | `INDIANAPI_KEY` configured |
| Google News RSS | ✅ Active (news fallback) | Free, no key |
| Screener.in | 🔴 Quarantined | HTML scraper — disabled pending REST API |
| Moneycontrol | 🔴 Not integrated | No API license; no scraping |

### 5. `.env` Files Updated

| File | Change |
|---|---|
| `.env` | New `UPSTOX_ACCESS_TOKEN` (fresh JWT) |
| `.env.production` | Added `INDIANAPI_KEY`, `UPSTOX_ACCESS_TOKEN` |
| `.env.production.example` | Added `UPSTOX_ACCESS_TOKEN` field |

### 6. Legacy Fix: `ingest-news.ts`

Replaced hardcoded dummy articles (fake Economic Times URLs) with a
deprecation stub pointing to `DataAcquisitionCoordinator.fetchNews()`.

---

## Data Flow Map (Post-Track-12C)

```
                    INGESTION BOUNDARY
                    ┌─────────────────┐
  Upstox Fundamentals│  isFiniteNumber │
  Yahoo v8          │  NaN→null       │
  IndianAPI         │  Infinity→null  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ PredictionFactory │
                    │ (null-safe merge) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        QualityEngine  ValuationEngine  StabilityEngine
        roa(2.0)       dividendYield(1) marketCap(1)
        roe(2.0)       peRatio(2)       debtToEquity(1.5)
        roic(2.0)      pbRatio(1)       currentRatio(1.5)
        grossMargin(2) evEbitda(1)      volatility(1)
        opMargin(2)    fcfYield(1)      beta(1)
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    ┌─────────────────┐
                    │  StockStoryEngine│
                    │  sector-weighted │
                    │  0-100 score     │
                    └─────────────────┘
```

## Known Gaps vs Moneycontrol

| Feature | Needed | Path |
|---|---|---|
| NSE/BSE real-time feed | Paid exchange license | — |
| Screener (100+ filters) | Screener.in REST API | Quarantine lifted when available |
| IPO / mutual fund / commodity data | New data sources | Future track |
| Indian news aggregator | Multiple Indian news sources | Future track |
| Financial calendars | Corporate actions feed | Partial (yfinance) |
| Analyst consensus | Aggregation service | Future track |
| Live WebSocket quotes | Broker WebSocket | Upstox WebSocket possible |

## Commit

```
track-12c: Activate ROA/dividend/market-cap, harden numeric normalisation,
           update Upstox token, audit ingestion pipelines
```

- 451/451 tests pass
- 19 files changed (engines, tests, env, scripts)
