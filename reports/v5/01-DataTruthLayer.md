# Data Truth Layer Report — V5 Agent 1

**Generated:** 2026-06-06T21:38:01.817Z
**Database:** stockstory.db (53.05 MB)
**Last Modified:** 2026-06-06T21:35:13.922Z

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Database Size | 53.05 MB |
| Total Data Rows | 215,340 |
| Table Status | 4 OK, 4 empty, 0 missing |

---

## Actions Performed

- ✅ Added missing column: financial_snapshots.snapshot_date
- ✅ Added missing column: financial_snapshots.roce
- ✅ Added missing column: financial_snapshots.operating_margin
- ✅ Added missing column: financial_snapshots.net_margin
- ✅ Added missing column: financial_snapshots.profit_growth
- ✅ Added missing column: financial_snapshots.fcf_yield
- ✅ Added missing column: financial_snapshots.ev_ebitda
- ✅ Created data_quality_registry table with 6 columns + indexes





---

## Table Row Counts

| Table | Status | Rows | Symbols | Date Range |
|-------|--------|------|---------|------------|
| daily_prices | ✓ OK | 37,140 | 30 | 2021-06-07 → 2026-06-05 |
| financial_snapshots | ○ EMPTY | 0 | 0 | N/A → N/A |
| data_quality_registry | ○ EMPTY | 0 | 0 | N/A → N/A |
| prediction_registry | ✓ OK | 106,920 | 30 | 2021-08-17 → 2026-06-05 |
| master_security_registry | ○ EMPTY | 0 | 0 | N/A → N/A |
| daily_prediction_snapshots | ○ EMPTY | 0 | N/A | N/A → N/A |
| factor_snapshots | ✓ OK | 35,640 | 30 | N/A → N/A |
| feature_snapshots | ✓ OK | 35,640 | 30 | N/A → N/A |

---

## Financial Snapshots Schema

| Column | Type | Description |
|--------|------|-------------|
| symbol | TEXT | Stock symbol (primary key part 1) |
| snapshot_date | TEXT | Date of snapshot in YYYY-MM-DD (primary key part 2) |
| pe_ratio | REAL | Price-to-earnings ratio |
| pb_ratio | REAL | Price-to-book ratio |
| roe | REAL | Return on equity |
| roce | REAL | Return on capital employed |
| debt_to_equity | REAL | Debt-to-equity ratio |
| operating_margin | REAL | Operating profit margin |
| net_margin | REAL | Net profit margin |
| market_cap | REAL | Market capitalization |
| revenue_growth | REAL | Year-over-year revenue growth (%) |
| profit_growth | REAL | Year-over-year profit growth (%) |
| fcf_yield | REAL | Free cash flow yield |
| ev_ebitda | REAL | Enterprise value to EBITDA |
| current_ratio | REAL | Current assets / current liabilities |

---

## Data Quality Registry Schema

| Column | Type | Description |
|--------|------|-------------|
| symbol | TEXT | Stock symbol (primary key part 1) |
| field | TEXT | Field name being tracked (primary key part 2) |
| freshness_date | TEXT | Date of last successful data fetch for this field |
| completeness_pct | REAL | Percentage of symbols with non-null values (0-100) |
| confidence_score | REAL | Confidence in the data quality (0-100) |
| source | TEXT | Data provider/source name |

---

## Data Freshness

| Table | Latest Date | Days Ago |
|-------|-------------|----------|
| daily_prices | 2026-06-05 | 1 |
| financial_snapshots | N/A | N/A |
| prediction_registry | 2026-06-05 | 1 |

---

## Integration Notes

- **financial_snapshots** is the canonical table for fundamental data consumed by Factor V3 engine (Agent 3).
- **data_quality_registry** is the canonical table for data freshness consumed by Cleanup/Compliance agent (Agent 4) and Dashboard (Agent 5).
- All columns use SQLite REAL type (8-byte floating point) — no PostgreSQL NUMERIC/DECIMAL aliases.
- Tables use composite primary keys (symbol + date/field) — no auto-increment surrogate keys.
