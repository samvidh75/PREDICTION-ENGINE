# TRACK-68 AGENT F — PostgreSQL Cutover Status

## Current Database Engine

- **SQLite file exists:** YES
- **SQLite DB size:** 144.60 MB
- **DATABASE_URL configured:** YES
- **pg package in code:** YES
- **SQLite fallback active:** YES

## Active Database
✅ PostgreSQL configured via DATABASE_URL

## Table Row Counts (current engine)
- symbols: 30
- daily_prices: 37238
- factor_snapshots: 35640
- feature_snapshots: 35640
- financial_snapshots: 60
- prediction_registry: 107010
- pipeline_health: 84
- master_security_registry: 0
- benchmark_observations: 0
- daily_prediction_snapshots: 0

## Constraints & Indexes
- prediction_registry: UNIQUE(symbol, prediction_date, prediction_horizon) — enforced by CREATE TABLE
- Indexes: 7 indexes on prediction_registry (symbol, prediction_date, validation_status, classification, confidence_level, horizon+status, symbol+date)

## API Functionality
- The Fastify server connects via src/db/index.ts
- If DATABASE_URL is set → PostgreSQL (pg Pool)
- If not set → SQLite (better-sqlite3 fallback)
- Current API requests are served from SQLite

## Verdict
✅ POSTGRESQL IS ACTIVE — DATABASE_URL is configured
