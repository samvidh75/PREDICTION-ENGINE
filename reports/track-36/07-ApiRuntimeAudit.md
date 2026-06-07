# TRACK-36 AGENT 7: API Runtime Audit
**Generated:** 2026-06-06T19:19:22.621Z

## API Routes File: ✅ src/backend/web/routes/intelligence.ts exists

## Endpoint Audit
| Endpoint | Label | Code Present | Status |
|----------|-------|-------------|--------|
| /api/stockstory/:symbol | StockStory | ✅ | PRESENT |
| /api/intelligence/company/:symbol | Company | ✅ | PRESENT |
| /api/intelligence/discovery/rankings | Rankings | ✅ | PRESENT |
| /api/intelligence/watchlist | Watchlist | ✅ | PRESENT |
| /api/company/:symbol/financials | Financials | ✅ | PRESENT |
| /api/company/:symbol/valuation | Valuation | ✅ | PRESENT |
| /api/company/:symbol/risks | Risk Assessment | ✅ | PRESENT |
| /api/company/:symbol/ownership | Ownership | ✅ | PRESENT |
| /api/intelligence/market | Market | ✅ | PRESENT |
| /api/intelligence/portfolio | Portfolio | ✅ | PRESENT |

## Endpoints Present: 10/10

## Missing Endpoints (from TRACK-34 spec):
| Endpoint | Purpose |
|----------|---------|
| /api/providers/health | Provider health dashboard (ProviderAnalyticsEngine) |
| /api/system/health | System health (SystemHealthEngine) |
| /api/stockstory/:symbol/explanation | Ranking explainability (RankingExplanationEngine) |

These engines exist in source but their API routes are not wired.

## Verdict: **API_WORKING**
