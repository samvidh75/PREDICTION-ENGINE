# Production Data Ingestion & Backtesting — Phase Report

## Phase 1: Baseline Verification

**Commit:** `85ba4031 Save uncommitted changes` (current working state)
**Branch:** main

### Current Engine Status

| Check | Result |
|-------|--------|
| `git pull --ff-only` | ✅ Already up to date |
| `npm run typecheck:active` | ✅ Clean (frontend + backend) |
| `npm run lint` | ⚠️ Pre-existing: `src/services/retention` glob missing |
| `npm run test:unit` | ✅ 1328 passed, 7 skipped |
| `npm run validate:hygiene` | ✅ No secrets (1 pre-existing warning) |
| `npm run build:frontend` | ✅ Built (577ms) |
| `npm run build:backend` | ✅ TypeScript + ESM imports fixed |

### Current Ingestion / Data Providers

- yfinance-based fundamentals ingestion (`scripts/ingest-fundamentals.ts`)
- Stock universe generation (`scripts/generate-stock-universe.ts`)
- Official symbols sync (`scripts/sync-official-symbols.ts`)
- Hydration scripts (`scripts/hydrate-production-data.ts`)
- authorized provider system (financials, shareholding, quotes)
- Upstox/StockEdge/Trendlyne/IndianAPI providers
- NSE/BSE universe sync (`scripts/sync-public-nse-universe.ts`)

### Current DB Tables (PostgreSQL + SQLite)

- `financial_snapshots` — fundamental data (PE, PB, EPS, ROE, ROA, margins, etc.)
- `feature_snapshots` — technical indicators (RSI, MACD, ADX, etc.)
- `daily_prices` — price candles
- Stock universe tables

### Current API Endpoints

- Frontend SPA at `/`
- Health check at `/healthz`, `/version`
- Market data, research, scanner, rankings routes

### Scope of This Phase

01. Baseline verification
02. Audit current data ingestion
03. Define production ingestion architecture
04. Database schema audit and additive migrations
05. Indian stock universe ingestion
06. Financial snapshot refresh
07. Technical snapshot refresh
08. News ingestion
09. Earnings/result ingestion
10. RAG document ingestion
11. Research snapshot generation job
12. Scanner and ranking refresh job
13. Watchlist alert generation
14. Job runner and scheduling
15. Production cron strategy
16. API additions/hardening
17. Backtesting framework
18. Production route verification script
19. Frontend integration check
20. Observability and internal status
21. Safety greps
22. Tests
23. Verification
24. Final reports
25. Commit and push
