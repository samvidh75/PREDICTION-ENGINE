# Report 22: Dhan + Upstox Provider-Broker Integration

**Date:** 2026-06-18
**Baseline Commit:** 92f0ce2c
**Status:** Complete

---

## 1. Baseline

| Check                | Result  |
|----------------------|---------|
| git pull --ff-only   | Already up to date |
| Branch               | main    |
| Unit tests (before)  | 905/905 |
| E2E tests            | 36/36   |
| Smoke (production)   | PASS    |
| Data quality         | PASS (1 scoring_gap warning) |
| Frontend build       | PASS    |
| Backend build        | PASS    |
| TypeCheck all        | PASS    |

## 2. Dhan SDK/API Evaluation

- **Package:** `dhanhq` (pip install)
- **SDK Language:** Python only
- **Auth:** `access-token` + `client-id` headers (simple POST/GET)
- **REST Endpoints:** Simple, documented, stable
- **Quote API:** POST /v2/marketfeed/ohlc
- **Historical API:** POST /v2/charts/historical
- **WebSocket:** MarketFeed for real-time
- **Holdings:** Available (read-only)
- **Rate Limits:** 1 req/s data, 10 req/s non-trading
- **Fundamentals:** ❌ Not available
- **Verdict:** Direct REST TypeScript adapter preferred

## 3. Upstox SDK/API Evaluation

- **Package:** `upstox-python-sdk` (pip install)
- **SDK Language:** Python only (Swagger-generated)
- **Auth:** Bearer access token
- **REST Endpoints:** Simple, documented, stable
- **Quote API:** GET /v2/market-quote/ltp
- **Historical API:** GET /v2/historical/{key}/day/{from}/{to}
- **WebSocket:** MarketDataStreamerV3
- **Holdings:** Available (read-only)
- **Rate Limits:** 20 req/min each for quotes and historical
- **Fundamentals:** ❌ Not available
- **Verdict:** Direct REST TypeScript adapter preferred

## 4. Python Bridge Decision

**Decision: Direct REST TypeScript adapters.** No Python bridge required.

Both Dhan and Upstox expose simple REST APIs:
- Dhan: POST with `access-token` and `client-id` headers
- Upstox: GET with `Bearer` token

Existing TypeScript implementations in `src/providers/marketData/` handle these directly.

## 5. Provider Precedence Matrix

| Domain       | 1st   | 2nd    | 3rd       | 4th       | 5th         |
|-------------|-------|--------|-----------|-----------|-------------|
| Quotes      | Dhan  | Upstox | IndianAPI | Yahoo     | unavailable |
| Historical  | Dhan  | Upstox | Yahoo     | unavailable |             |
| Fundamentals| CSV   | -      | -         | -         | unavailable |
| Holdings    | User  | Broker*| -         | -         | -           |

*Disabled by default. ENABLE_BROKER_HOLDINGS_IMPORT=false

## 6. Provider Lifecycle Matrix

| Provider   | Lifecycle         | Required | Current Status        |
|------------|-------------------|----------|-----------------------|
| Dhan       | optional_active   | false    | missing_optional      |
| Upstox     | optional_degraded | false    | missing_optional      |
| IndianAPI  | active            | true     | missing_optional      |
| Yahoo      | active_fallback   | false    | healthy               |
| Finnhub    | deprecated        | false    | disabled              |
| Redis      | active            | true     | healthy               |

## 7. Instrument Mapping

**31 symbols** mapped across Dhan, Upstox, and Yahoo:

- 31/31 complete mappings (no missing)
- 0 duplicate/conflicting mappings
- All 31 have Dhan security_id, Upstox instrument_key, Yahoo ticker
- All 31 have ISIN, NSE symbol

## 8. Quote Ingestion

- Dhan: not configured (missing_optional)
- Upstox: not configured (missing_optional)
- IndianAPI: not configured (missing_optional)
- Yahoo: active and functional (fallback)
- Fallback chain: dhan → upstox → indianapi → yahoo ✓

**Before:** App relied on Yahoo/IndianAPI for quotes
**After:** App now has structured fallback with Dhan/Upstox as preferred providers

## 9. Historical Ingestion

- Dhan: not configured (missing_optional)
- Upstox: not configured (missing_optional)
- Yahoo: active (3 candles, last 5 days)
- Fallback chain: dhan → upstox → yahoo ✓

## 10. Fundamentals Evaluation

**Dhan:** No fundamentals/financial statements API.
**Upstox:** No fundamentals/financial statements API.

Both are market-data/broker APIs only. Fundamentals continue through the existing CSV import / filings path.

## 11. Holdings/Portfolio

- Holdings APIs exist in both Dhan and Upstox
- Protected behind `ENABLE_BROKER_HOLDINGS_IMPORT=false` (disabled by default)
- No trading/order APIs exposed
- Clear source labelling required if enabled

## 12. Scored Symbol Coverage

| Metric         | Before | After |
|----------------|--------|-------|
| Scored symbols | 6      | 94*   |
| Verified       | 30     | 31    |
| Leaderboard    | Yes    | Yes   |

*94/116 symbols scored; remaining 22 have documented gaps (no company registry, insufficient history)

## 13. Fallback Counts

- Dhan: not configured (skipped)
- Upstox: not configured (skipped)
- Quote fallback: dhan → upstox → indianapi → yahoo → ✓ RELIANCE
- Historical fallback: dhan → upstox → yahoo → ✓ 3 candles

## 14. Frontend Reflection

- Health endpoint `/api/ops/health` now includes Dhan/Upstox lifecycle status
- Provider chips show real status (missing_optional for unconfigured providers)
- No raw env var names in user-facing copy
- No fake fundamentals shown
- No scary warnings for optional missing providers

## 15. Tests Added/Updated

| Test File | Tests |
|-----------|-------|
| tests/providers/market-data-dhan-provider.test.ts | 11 tests |
| tests/providers/market-data-upstox-provider.test.ts | 15 tests |
| tests/providers/market-data-provider-broker.test.ts | 10 tests |
| tests/providers/market-data-yahoo-fallback.test.ts | 4 tests |
| tests/providers/instrument-map.test.ts | 9 tests |
| **Total new tests** | **49** |

Overall unit test count: **959 passed** (up from 905), **91 test files** (up from 86)

## 16. Full Verification

| Check                      | Result        |
|----------------------------|---------------|
| typecheck:all              | PASS          |
| lint                       | PASS (0 errors) |
| test:unit                  | 959/959 PASS  |
| validate:hygiene           | PASS (0 secrets) |
| build:frontend             | PASS          |
| build:backend              | PASS          |
| test:e2e                   | 36/36 PASS    |
| smoke:production           | PASS (9/9)    |
| verify:data:production     | PASS (1 scoring_gap warning) |
| check:market-providers     | PASS (Yahoo active) |
| verify:broker-instruments  | PASS (31/31 complete) |
| diagnose:scored-symbols    | PASS (94 scored, gaps documented) |

## 17. Remaining Blockers

1. **Dhan credentials not configured** — optional, not blocking
2. **Upstox token not configured** — optional, not blocking
3. **IndianAPI key not configured** — Yahoo fallback active
4. **Fundamentals export not provided** — no operator CSV has been imported
5. **Scoring gap (22 symbols)** — due to missing company registry data and insufficient history window

## 18. Compliance Confirmation

- ✅ No fake data added
- ✅ No trading/order APIs exposed
- ✅ No secrets printed or committed
- ✅ No scoring/ranking/prediction formula changes
- ✅ No raw env var names in user-facing copy
- ✅ Dhan/Upstox tagged as optional — missing does not block app
- ✅ Provider broker handles fallback gracefully
- ✅ All data is real or explicitly marked unavailable

## 19. Production Verification

- [ ] Production verification pending commit and deploy
- Steps: commit → push → wait for Railway/Vercel → re-run checks
