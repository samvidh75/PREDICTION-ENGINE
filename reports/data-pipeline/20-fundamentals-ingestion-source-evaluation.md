# Fundamentals Ingestion Source Evaluation

**Baseline commit**: `d2d36580`
**Date**: 2026-06-17

---

## Summary

Evaluated Screener.in, Moneycontrol, BSE, and NSE as fundamentals sources. Screener.in and Moneycontrol pages are technically reachable with public financial data, but HTML parsing is inherently brittle. Built a robust CSV export import pipeline as the primary recommended path. Created the schema migration for source tracking, a fundamentals import template, validators, and documentation.

---

## Screener Feasibility Result

| Check | Result |
|---|---|
| Screener.in company page | **Reachable** — 484 financial fields detected |
| Screener.in consolidated | **Reachable** — 486 fields |
| Screener.in quarterly | **Reachable** — 484 fields |
| Auth required | No (public pages) |
| Technical reliability | **Brittle** (HTML parsing) |

Screener.in pages are publicly accessible (no login required) and contain extensive financial data. However, HTML page parsing is fragile — any CSS class rename or layout change breaks extraction. The **preferred approach is user-provided CSV exports** rather than automated HTML scraping.

## Moneycontrol Feasibility Result

| Check | Result |
|---|---|
| Moneycontrol financials | **Blocked** (HTTP 404 — wrong URL format) |
| Moneycontrol ratios | **Reachable** — 1,383 fields detected |
| Auth required | No (public pages) |
| Technical reliability | **Brittle** (HTML parsing) |

Moneycontrol ratio pages are reachable with extensive financial data. The financials overview URL needs format adjustment. Same brittleness concern as Screener.in — CSV exports are preferred.

## Other Sources

| Source | Status | Detail |
|---|---|---|
| BSE listed companies | Reachable | 32 fields, basic metadata only |
| NSE company info | Auth required | API access control (401) |
| Finnhub | Deprecated | Removed from active pipeline |
| Upstox fundamentals | Expired token | HTTP 401, needs OAuth refresh |
| IndianAPI fundamentals | Plan-limited | ₹399 tier — no fundamentals |

## Chosen Ingestion Path

**Primary: User-provided CSV export import**

The CSV import pipeline was chosen because:
1. **Stable format** — CSV structure is well-defined and version-controllable
2. **Validatable** — Schemas, types, dates, and ranges can be checked before import
3. **Idempotent** — Re-running the same import is safe (upsert)
4. **No brittle parsing** — Avoids HTML scraping fragility
5. **Permission-safe** — No access-control bypass, no credential storage, no CAPTCHA circumvention

**Not chosen: Automated HTML scraping** — Screener.in and Moneycontrol pages are technically reachable, but automated HTML extraction is inherently brittle and would require ongoing maintenance.

## Scripts Added

| Script | Purpose |
|---|---|
| `scripts/probe-fundamentals-sources.ts` | Safe diagnostic probe for Screener/Moneycontrol/BSE/NSE |
| `scripts/import-fundamentals-export.ts` | CSV import engine with column aliasing, validation, dry-run/apply |
| `scripts/validate-fundamentals-template.ts` | Pre-import CSV validation (columns, types, dates, symbols) |

## Migration Added

`src/db/migrations/021_add_fundamentals_source_columns.sql`:
- `source_label TEXT` — data origin (e.g., `screener_export`)
- `source_url TEXT` — optional source URL
- `period_type TEXT` — `annual`, `quarterly`, `ttm`, `unknown`
- `metrics_json TEXT` — JSON with absolute values (revenue, net_profit, etc.)
- `ingestion_run_id TEXT` — unique import batch ID
- `ingestion_timestamp TEXT` — when the row was imported

All columns use `ADD COLUMN IF NOT EXISTS` — idempotent, no destructive changes.

## Import Template

`data/templates/fundamentals-import-template.csv` with 26 columns covering:
- Identification: symbol, company_name, period_end_date, period_type
- Financials: revenue, operating_profit, net_profit, eps, book_value, debt, equity
- Ratios: roe, roce, debt_to_equity, operating_margin, net_margin, pe_ratio, pb_ratio
- Growth: revenue_growth, profit_growth
- Cash flow: operating_cash_flow, free_cash_flow
- Provenance: source_label, source_url

## Dry-Run Result

```
npm run validate:fundamentals -- --file=data/templates/fundamentals-import-template.csv
  ✓ No issues found — template is valid.

npm run import:fundamentals -- --source=manual --file=data/templates/fundamentals-import-template.csv --dry-run
  ✓ Row 2: RELIANCE  18 fields
  ✓ Row 3: TCS  18 fields
  OK: 2, Errors: 0
  Dry-run complete. No DB writes.
```

## Fundamentals Coverage

| Metric | Before | After (pipeline) | Notes |
|---|---|---|---|
| financial_snapshots | 28 rows, 28 symbols | 28 rows, 28 symbols | No change — import requires real export file |
| Source tracking | None | source_label, source_url, period_type | Added via migration |
| Absolute metrics | Not stored | metrics_json | Added via migration |
| Import automation | Manual export only | CSV import pipeline | Ready for operator use |

Fundamentals coverage will increase once a real export file is provided and imported. The migration must be applied on Railway first (`railway run` to execute the SQL).

## Frontend Reflection

Company pages and Trust Centre correctly show fundamentals as either available or unavailable based on existing data. No changes were needed to the frontend — the existing field-level unavailable state handles missing fundamentals correctly.

## Data Quality

Data quality verification now includes a `fundamentals` check:
- Validates `financialSnapshots.rowCount` exists and > 0
- Passes with current production data (28 rows)

## Full Verification

| Check | Result |
|---|---|
| `npm run typecheck:all` | ✅ |
| `npm run lint` | ✅ |
| `npm run test:unit` | ✅ 905/905 (86 files) |
| `npm run validate:hygiene` | ✅ PASS |
| `npm run build:frontend` | ✅ (1.26s) |
| `npm run build:backend` | ✅ |
| `npm run test:e2e` | ✅ 36/36 (12.0s) |
| `npm run smoke:production` | ✅ 7/7 |
| `npm run verify:data:production` | ✅ 8/8 (fundamentals check added) |

## Remaining Blockers

1. **No real fundamentals export file** — The import pipeline is ready but awaits an operator-provided CSV export from Screener.in or Moneycontrol. See `docs/data/fundamentals-import.md` for instructions.
2. **Migration must be applied on Railway** — The `021_add_fundamentals_source_columns.sql` migration needs to run on the Railway Postgres before the import can write source tracking columns.
3. **Upstox token expired** — The Upstox fundamentals provider remains unavailable (HTTP 401). The new CSV import pipeline is the recommended replacement.

## Provider-Specific Unavailable Reasons

| Provider | Reason | Recommendation |
|---|---|---|
| Upstox fundamentals | Token expired (HTTP 401) | OAuth refresh or use CSV import |
| IndianAPI fundamentals | ₹399 plan — no fundamentals endpoint | Plan upgrade or use CSV import |
| Finnhub | Deprecated from active pipeline | Not recommended |
| Screener.in (scraping) | Public pages but HTML is brittle | Use CSV exports instead |
| Moneycontrol (scraping) | Public pages but HTML is brittle | Use CSV exports instead |

## Confirmations

- ✅ No fake fundamentals added
- ✅ No access-control bypass added
- ✅ No credentials, cookies, or session tokens stored
- ✅ No HTML scraping automation implemented
- ✅ No brittle page parsing in production
- ✅ No scoring/ranking/prediction formula changes
- ✅ No secrets printed or committed
