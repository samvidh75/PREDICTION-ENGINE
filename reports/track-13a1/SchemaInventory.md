# Schema Inventory — TRACK-13A.1

**Date:** 2026-06-06

## Core Tables Required for TRACK Calibration

### symbols

| Property | Value |
| --- | --- |
| Migration | 001_create_warehouse_tables.sql |
| Primary Key | id (SERIAL), symbol (UNIQUE VARCHAR(20)) |
| Foreign Key | REFERENCES symbols(symbol) ON DELETE CASCADE |
| Key Columns | symbol, exchange, isin, company_name, sector, industry, listing_status |
| Purpose | Master universe of Indian stocks. Source of truth for all symbol lookups. |

### financial_snapshots

| Property | Value |
| --- | --- |
| Migration | 001 + 005 + 006 |
| Primary Key | (symbol, period_end) |
| Foreign Key | REFERENCES symbols(symbol) ON DELETE CASCADE |
| Key Columns | pe_ratio, pb_ratio, eps, dividend_yield, beta, free_float, market_cap, fcf_yield, ev_ebitda, roa, roe, roic, debt_to_equity, current_ratio, revenue_growth, profit_growth, eps_growth, fcf_growth, gross_margin, operating_margin |
| Purpose | Per-period fundamental data. One row per symbol per quarter-end. |

### feature_snapshots

| Property | Value |
| --- | --- |
| Migration | 002_create_feature_factor_tables.sql |
| Primary Key | (symbol, trade_date) |
| Foreign Key | REFERENCES symbols(symbol) ON DELETE CASCADE |
| Key Columns | rsi, macd, macd_signal, macd_histogram, adx, atr, bollinger_width, momentum, volatility, relative_strength, moving_average_distance, trend_strength |
| Purpose | Technical indicators computed daily. Input to MomentumEngine. |

### factor_snapshots

| Property | Value |
| --- | --- |
| Migration | 002_create_feature_factor_tables.sql |
| Primary Key | (symbol, trade_date) |
| Foreign Key | REFERENCES symbols(symbol) ON DELETE CASCADE |
| Key Columns | quality_factor, value_factor, growth_factor, momentum_factor, risk_factor, sector_strength_factor, factor_score, explanations (JSONB) |
| Purpose | Composite factor scores. These ARE the engine output scores. Core to all calibration audits. |

### daily_prices

| Property | Value |
| --- | --- |
| Migration | 001_create_warehouse_tables.sql |
| Primary Key | (symbol, trade_date) |
| Foreign Key | REFERENCES symbols(symbol) ON DELETE CASCADE |
| Key Columns | open, high, low, close, adjusted_close, volume |
| Purpose | OHLCV data. Source for technical indicator computation. |

## Supporting Tables

| Table | Migration | Purpose |
| --- | --- | --- |
| user_profiles | 002b | Firebase Auth user profiles |
| investor_state | 003 | User watchlists, alerts, memory |
| shareholding_patterns | 004 | Quarterly promoter/FII/DII/public holdings |
| valuation_snapshots | 004 | Periodic PE/PB/EV_EBITDA ratings |
| corporate_timeline | 004 | Corporate events (Results, Dividends, M&A) |
| news_articles | 001 | RSS/news article storage |
| provider_logs | 001 | API call logging for cost tracking |
| backfill_jobs | 001 | Backfill job tracking metadata |
| backfill_chunks | 001 | Backfill chunk execution state |

## TRACK-13/14 Minimum Required Tables

| Table | Required | Reason |
| --- | --- | --- |
| symbols | ✅ CRITICAL | Universe definition, sector classification |
| financial_snapshots | ✅ CRITICAL | ROE, ROA, ROIC, D/E, revenue_growth, profit_growth, op_margin, market_cap |
| factor_snapshots | ✅ CRITICAL | quality_factor, growth_factor, value_factor, momentum_factor, risk_factor — the engine output scores |
| feature_snapshots | ✅ REQUIRED | RSI, ADX, momentum, trend_strength — technical validation |
| daily_prices | ⚠️ OPTIONAL | Not directly used by TRACK audits; used for technical indicator computation |
