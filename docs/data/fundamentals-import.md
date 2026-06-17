# Fundamentals Import Guide

## Overview

StockStory India imports financial fundamentals from **user-provided CSV exports**. This is the preferred ingestion path because:

1. CSV exports are stable and well-defined (unlike HTML scraping)
2. Data quality can be validated before import
3. The import is idempotent (safe to re-run)
4. No brittle HTML parsing or access-control bypass

## Supported Sources

| Source | Method | Status |
|---|---|---|
| Screener.in | CSV export (manual, user-provided) | Preferred |
| Moneycontrol | CSV export (manual, user-provided) | Alternative |
| Manual CSV | Template-based (any source) | Fallback |

## Prerequisites

1. A CSV file exported from Screener.in, Moneycontrol, or the project template
2. Symbols must exist in the production database (run `npm run verify:symbols:production` first)

## CSV Format

The expected CSV columns (from `data/templates/fundamentals-import-template.csv`):

| Column | Required | Description |
|---|---|---|
| `symbol` | Yes | NSE ticker (e.g., RELIANCE) |
| `company_name` | No | Company name |
| `period_end_date` | Yes | End date of fiscal period (YYYY-MM-DD) |
| `period_type` | No | `annual`, `quarterly`, `ttm`, or `unknown` |
| `currency` | No | Default: INR |
| `unit` | No | `crore`, `lakh`, or unspecified |
| `revenue` | No | Total revenue/sales |
| `operating_profit` | No | Operating profit / EBIT |
| `net_profit` | No | Net profit / PAT |
| `eps` | No | Earnings per share |
| `book_value` | No | Book value per share |
| `debt` | No | Total debt |
| `equity` | No | Shareholders' equity |
| `roe` | No | Return on equity (%) |
| `roce` | No | Return on capital employed (%) |
| `debt_to_equity` | No | Debt-to-equity ratio |
| `operating_margin` | No | Operating margin (%) |
| `net_margin` | No | Net profit margin (%) |
| `pe_ratio` | No | Price-to-earnings ratio |
| `pb_ratio` | No | Price-to-book ratio |
| `revenue_growth` | No | Revenue growth (%) |
| `profit_growth` | No | Profit growth (%) |
| `operating_cash_flow` | No | Operating cash flow |
| `free_cash_flow` | No | Free cash flow |
| `source_label` | Yes | e.g., `screener_export`, `moneycontrol_export`, `manual_import` |
| `source_url` | No | URL to the source page |

## How to Export from Screener.in

1. Open Screener.in company page (e.g., `https://www.screener.in/company/RELIANCE/`)
2. Scroll to the financials section
3. Copy the data manually into the CSV template
4. Or use the browser's "Export to CSV" feature if available

For bulk imports, prepare a CSV with all symbols and their fundamentals.

## Local Dry-Run

```bash
# Validate the template
npx tsx scripts/validate-fundamentals-template.ts --file=data/templates/fundamentals-import-template.csv

# Dry-run import (parses CSV, validates, prints planned rows — no DB writes)
npx tsx scripts/import-fundamentals-export.ts --source=manual --file=./path/to/your-export.csv --dry-run
```

## Production Apply

Once dry-run is clean and you have a real export file:

### Local DB
```bash
npx tsx scripts/import-fundamentals-export.ts --source=screener --file=./path/to/export.csv --apply
```

### Railway Production
```bash
# Upload the file to Railway, then run:
railway run --service PREDICTION-ENGINE --environment production \
  npx tsx scripts/import-fundamentals-export.ts --source=screener --file=./path/to/export.csv --apply
```

## Verification

```bash
# Check fundamentals coverage
npm run verify:data:production

# Production smoke
npm run smoke:production

# Check individual company
curl https://www.stockstory-india.com/api/stockstory/<SYMBOL>
```

## Schema

The import writes to `financial_snapshots` with these additional fields:

- `source_label` — text (e.g., `screener_export`)
- `source_url` — text (optional URL)
- `period_type` — text (`annual`, `quarterly`, `ttm`, `unknown`)
- `metrics_json` — text (JSON with absolute values like revenue, net_profit, etc.)
- `ingestion_run_id` — text (unique import run identifier)

## Error Handling

| Scenario | Behavior |
|---|---|
| Missing required column | Reject, show specific column name |
| Invalid date format | Reject row, show expected format |
| NaN/Infinity in numeric field | Reject row, show field name |
| Symbol not in known universe | Warning (import continues) |
| Duplicate (symbol + period_end) | Upsert (update existing) |
| Unknown column | Warning, column ignored |
| File not found | Exit with error |

## No Fake Data

This pipeline does not:
- Fabricate missing values
- Generate synthetic financials
- Scrape websites without permission
- Store or use credentials/cookies/session tokens
- Bypass access controls or CAPTCHA
