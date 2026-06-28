# Phase 16: Data Moat, Indian Market Coverage Expansion, Filing Intelligence, and Research Corpus

## Baseline

- **Commit:** `c8322853fa99c20d72a938ae58e1a44a49d0ecde`
- **Typecheck (frontend):** PASS
- **Typecheck (backend):** PASS
- **Lint:** PASS (0 errors)
- **Hygiene:** PASS (no secrets, 2 warnings pre-existing)
- **Tests:** 1459 passed, 92 failed (pre-existing PMF-related), 7 skipped
- **Build (frontend):** PASS
- **Build (backend):** PASS

## Current Data Sources

| Source | Status | Type |
|--------|--------|------|
| IndianAPI Premium | Active ingestion | API (python) |
| BSE/NSE exchange data | Probes exist | Python libs |
| Yahoo Finance | Probes exist | API |
| StockEdge | Probes exist | API |
| Trendlyne | Probes exist | API |
| Upstox | Broker config | API |
| Dhan | Broker config | API |
| Screener.in | Ingestion script | API |
| Public fundamentals | Ingestion script | API |

## Current Universe Coverage

- **Table:** `stocks` with `symbol`, `name`, `exchange`, `sector`, `sub_sector`, `market_cap`, `isin`
- **Scripts:** `scripts/generate-stock-universe.ts`, `scripts/sync-official-symbols.ts`, `scripts/ingest-official-stocks.ts`
- **Module:** `src/stockstory/ingestion/StockUniverseIngestion.ts`

## Current Financial Data Coverage

- **Tables:** `company_fundamental_snapshots`, `company_financial_statement_tables`, `company_profile_overviews`
- **Key metrics:** PE, PB, ROCE, ROE, D/E, dividend yield, EPS, book value, sales/profit growth, margins
- **Freshness:** Per-ingestion timestamps tracked

## Current Technical Data Coverage

- Technical indicators computed via `TechnicalIndicatorService`
- Market prices in `market_live_price_snapshots`

## Current News Coverage

- News ingestion in `src/stockstory/ingestion/NewsIngestion.ts`
- Headlines in `stock_live_snapshot`

## Current Document/RAG Coverage

- **No dedicated `src/stockstory/rag/` module exists**
- RAG document ingestion exists in `src/stockstory/ingestion/RagDocumentIngestion.ts`
- Evidence system exists in `src/stockstory/intelligence/evidence/`

## Current Filings Support

- **No dedicated filings module** — filings data not yet systematically ingested

## Current Ingestion Jobs

- `universe:generate`, `universe:sync`, `universe:sync-official`
- `indianapi:premium:ingest` (Python)
- `job:indianapi-premium` (periodic refresh)
- `ingest:screener`, `ingest:fundamentals`
- `ingest:authorized:financials`, `ingest:authorized:shareholding`, `ingest:authorized:corporate-actions`, `ingest:authorized:quotes`

## Current DB Schema Relevant to Data

Existing tables: stocks, stock_updates, market_live_price_snapshots, company_profile_overviews, company_fundamental_snapshots, company_financial_statement_tables, company_shareholding_snapshots, company_corporate_actions, stock_live_snapshot, stock_intelligence_history, stock_super_scan_results

## Scope of This Phase

Build comprehensive data moat covering: source registry, equity universe expansion, company identity, data quality scoring, evidence lineage, corporate actions, filing intelligence, quarterly results, documents/RAG, transcripts (if legal), shareholding risk, disclosures, index/sector membership, macro context, liquidity/derivatives, news quality, reconciliation, ingestion jobs, DB migrations, intelligence/API/frontend integration, policy docs, validation, safety and tests.
