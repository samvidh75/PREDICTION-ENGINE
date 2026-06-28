# Data Ingestion Audit — Phase 2

| Area | Existing file/script | Status | Production-safe? | Issues | Action |
|------|---------------------|--------|-----------------|--------|--------|
| Stock universe | `scripts/generate-stock-universe.ts` | ✅ Active | ✅ | Uses yfinance/NSE/BSE sources | Keep |
| Official symbols | `scripts/ingest-official-stocks.ts` | ✅ Active | ✅ | NSE/BSE master | Keep |
| Symbol sync | `scripts/sync-official-symbols.ts` | ✅ Active | ✅ | — | Keep |
| NSE universe | `scripts/sync-public-nse-universe.ts` | ✅ Active | ✅ | — | Keep |
| Financials | `scripts/ingest-fundamentals.ts` | ✅ Active | ✅ | yfinance provider | Keep |
| Financials (authorized) | `scripts/ingest-authorized-financials.ts` | ✅ Active | ✅ | Authorized provider | Keep |
| Financials (public) | `scripts/import-public-fundamentals.ts` | ✅ Active | ✅ | Public source | Keep |
| Shareholding | `scripts/ingest-authorized-shareholding.ts` | ✅ Active | ✅ | — | Keep |
| Corp actions | `scripts/ingest-authorized-corporate-actions.ts` | ✅ Active | ✅ | — | Keep |
| Quotes | `scripts/ingest-authorized-quotes.ts` | ✅ Active | ✅ | — | Keep |
| Hydration | `scripts/hydrate-production-data.ts` | ✅ Active | ✅ | Maps canonical to DB | Keep |
| Data pipeline | `scripts/run-production-data-pipeline.ts` | ✅ Active | ✅ | Orchestrates refresh | Keep |
| Price history | `scripts/backfill-public-market-history.ts` | ✅ Active | ✅ | — | Keep |
| Predictions | `scripts/run-prediction-pipeline.ts` | ✅ Active | ✅ | — | Keep |
| Stock page snapshots | `scripts/materialize-stock-page-snapshots.ts` | ✅ Active | ✅ | Research snapshots | Keep |
| Scanner results | `scripts/materialize-scanner-results.ts` | ✅ Active | ✅ | — | Keep |
| Technical indicators | `src/backend/services/technicals/TechnicalIndicatorService.ts` | ✅ Active | ✅ | — | Keep |
| Super scans | `scripts/run-super-scans.ts` | ✅ Active | ✅ | — | Keep |
| IndianAPI premium | `scripts/run-indianapi-premium-job.ts` | ✅ Active | ✅ | Python+TS | Keep |
| RAG ingestion | `scripts/ (none dedicated)` | ❌ Missing | — | No RAG ingestion script | Create |
| News ingestion | `scripts/ (none dedicated)` | ❌ Missing | — | No news ingestion pipeline | Create |
| Earnings/result | `scripts/ (none dedicated)` | ❌ Missing | — | No structured earnings ingestion | Create |
| Event detection | `scripts/ (none dedicated)` | ❌ Missing | — | No event detection system | Create |
| Job runner | `scripts/ (no centralized runner)` | ⚠️ Ad-hoc | ⚠️ | Each script is standalone | Create JobRunner |
| Watchlist alerts | `src/research/alerts/alertsEngine.ts` | ✅ Exists | ✅ | Alert engine exists | Integrate |
| Backtesting | `scripts/backtesting-framework.ts` | ⚠️ Exists | ⚠️ | Needs audit | Extend |
| Research engine | `src/research/engine/researchEngine.ts` | ✅ Active | ✅ | Core research engine | Keep |
| StockStory engine | `src/stockstory/StockStoryEngine.ts` | ✅ Active | ✅ | Master engine | Keep |
| Intelligence engines | `src/stockstory/intelligence/` | ✅ Active | ✅ | 9 engines + RAG | Keep |

## Key Gaps

1. **No dedicated ingestion classes** in `src/stockstory/ingestion/` — scripts are standalone
2. **No centralized job runner** — each script runs independently
3. **No news ingestion pipeline** — no scheduled news refresh
4. **No structured earnings/result ingestion** beyond what fundamentals provide
5. **No RAG ingestion script** — KnowledgeBase exists but no scheduled ingestion
6. **No backtesting against intelligence engine scores** — framework exists for old engine
7. **No watchlist alert as a scheduled job** — engine exists but not scheduled
8. **No job run tracking** — no `job_runs` table
