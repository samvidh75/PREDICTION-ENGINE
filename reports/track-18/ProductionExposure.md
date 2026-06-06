# Production Exposure — TRACK-18

**Date:** 2026-06-06

## Can synthetic data enter production rankings?

### Production API Endpoints (src/backend/web/routes/intelligence.ts)

| Endpoint | Data Source | Synthetic Risk |
| --- | --- | --- |
| `GET /api/stockstory/:symbol` | DB (financial_snapshots + factor_snapshots + feature_snapshots) | 🔴 HIGH — if DB was populated by expand-market-coverage.ts |
| `GET /api/intelligence/company/:symbol` | DB snapshots + ProviderCoordinator fallback | 🟡 MEDIUM — fallback to DB snapshots if providers fail |
| `GET /api/intelligence/discovery/rankings` | DB factor_snapshots | 🔴 HIGH — ranking reads from factor_snapshots table |
| `GET /api/intelligence/watchlist` | DB + ProviderCoordinator | 🟡 MEDIUM — mix of DB snapshots and live quotes |

### StockStoryEngine (src/stockstory/StockStoryEngine.ts)

| Input | Source | Synthetic Risk |
| --- | --- | --- |
| features | EngineInputs (from DB feature_snapshots or provider fallback) | 🔴 HIGH if DB is synthetic |
| factors | EngineInputs (from DB factor_snapshots) | 🔴 HIGH if DB is synthetic |
| financials | EngineInputs (from DB financial_snapshots or provider merge) | 🔴 HIGH if DB is synthetic |

### API Route Fallback Logic (intelligence.ts lines 520-565)

The StockStory endpoint has a fallback chain:
1. Try DB snapshots (primary)
2. If features missing (rsi == null, macd == null, etc.), call ProviderCoordinator.getHistory()
3. Build EngineInputs from whichever source succeeded

**Risk:** If DB has synthetic data with non-null values, the fallback is NEVER triggered. Synthetic data is served as production rankings.

### Verification

The intelligence route checks `feat.rsi == null || feat.macd == null` — if these are non-null (they are from expand-market-coverage.ts), no provider fallback is attempted. The synthetic values flow directly into StockStoryEngine.evaluate().

## Consumer Audit

| Consumer | Consumes | Synthetic? |
| --- | --- | --- |
| StockStoryEngine | EngineInputs from DB | 100% synthetic (if DB from expand-market-coverage) |
| MarketIntelligenceEngine | Factor snapshots from DB | 100% synthetic |
| CompanyIntelligenceEngine | Features + factors from DB | 100% synthetic |
| PortfolioIntelligenceEngine | Factor scores from DB | 100% synthetic |
| FactorEngine | Reads financials + prices from DB | 100% synthetic input |
| calibrate.ts | All 4 DB tables | 100% synthetic |
| TRACK-14 audit scripts | All 4 DB tables | 100% synthetic |

## VERDICT

**Production endpoints currently serve 100% synthetic rankings** because the database was built from expand-market-coverage.ts. Every API response, every ranking, every engine score is derived from mathematically generated random data.
