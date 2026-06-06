# TRACK-18 — Production Exposure Audit

## Q4: Can Any API Endpoint Serve Synthetic Data?

---

### `GET /api/stockstory/:symbol`

| Aspect | Detail |
|--------|--------|
| **Data source** | `feature_snapshots` table → EngineInputs.features |
| **Can serve synthetic?** | **YES** — if DB was populated by `expand-market-coverage.ts`, ALL features, factors, and financials are synthetic |
| **Fallback path** | (Removed via TRACK-15 — now returns null) |
| **Current state** | DB unreachable (ECONNREFUSED) — endpoint returns 500 or fails to connect |

---

### Market Intelligence Routes

| Route | Data Source | Can Serve Synthetic? |
|-------|------------|---------------------|
| `GET /api/intelligence/market` | `feature_snapshots`, `factor_snapshots` (DB queries) | **YES** — market mood, breadth, risk appetite derived from DB data |
| `GET /api/intelligence/discovery/rankings` | `factor_snapshots` (DB queries) | **YES** — rankings from DB factors |
| `GET /api/intelligence/company/:symbol` | `feature_snapshots` + `factor_snapshots` | **YES** — insight, outlook, narrative from DB |

---

### Factor Routes

| Route | Data Source | Can Serve Synthetic? |
|-------|------------|---------------------|
| `GET /api/intelligence/watchlist` | `daily_prices` + `factor_snapshots` | **YES** — price changes and factor deltas from DB |

---

### Portfolio Routes

| Route | Data Source | Can Serve Synthetic? |
|-------|------------|---------------------|
| `GET /api/intelligence/portfolio` | PortfolioIntelligenceEngine (reads `factor_snapshots`) | **YES** — portfolio evaluation from DB |

---

### Financial Routes

| Route | Data Source | Can Serve Synthetic? |
|-------|------------|---------------------|
| `GET /api/company/:symbol/financials` | `financial_snapshots` (DB) | **YES** — PE, EPS, market cap from DB |
| `GET /api/company/:symbol/valuation` | `valuation_snapshots` + `financial_snapshots` | **YES** |

---

### Routes That Use Synthetic `generate500Stocks()` Data

`expand-market-coverage.ts` seeds the DB with synthetic data for ALL 505 stocks. Every API route that reads from the DB serves synthetic data when the DB was populated by this script.

---

### Routes With Hardcoded Fallbacks (Not Synthetic, But Not Real Either)

| Route | Fallback | Real? |
|-------|----------|-------|
| `GET /api/intelligence/company/:symbol` (no feat/fact) | Hardcoded fallback object (lines 55-83) | **NO** — hardcoded "RELIANCE is trading under stable parameters..." |
| `GET /api/stockstory/:symbol` (no feat) | Null features (TRACK-15) | **NO** — null features → neutral scores |

---

### Production Exposure Summary

| Data Layer | Populated By | Real Data? |
|------------|-------------|------------|
| `symbols` table | `expand-market-coverage.ts` | ✅ Real tickers, names, sectors |
| `daily_prices` table | `expand-market-coverage.ts` | ❌ 100% Math.random() |
| `financial_snapshots` table | `expand-market-coverage.ts` | ❌ 100% Math.random() |
| `feature_snapshots` table | FeatureEngine (from synthetic daily_prices) | ❌ Derived from synthetic prices |
| `factor_snapshots` table | FactorEngine (from synthetic features) | ❌ Derived from synthetic features |
| `shareholding_patterns` table | Migration 004 | ❓ Unknown |
| `corporate_timeline` table | Migration? | ❓ Unknown |
| `valuation_snapshots` table | ? | ❓ Unknown |

**Every API endpoint that reads from `daily_prices`, `financial_snapshots`, `feature_snapshots`, or `factor_snapshots` can serve 100% synthetic data if the DB was seeded by `expand-market-coverage.ts`. This includes EVERY /api/stockstory, /api/intelligence, /api/company, and /api/intelligence/discovery route.**

---

### How to Verify Current State

1. Start PostgreSQL
2. Query: `SELECT COUNT(*), COUNT(DISTINCT symbol) FROM daily_prices`
3. Query: `SELECT symbol, close FROM daily_prices WHERE symbol='RELIANCE' ORDER BY trade_date DESC LIMIT 5`
4. Compare with live Yahoo data for RELIANCE

If the prices don't match real market data, the DB contains synthetic data.
