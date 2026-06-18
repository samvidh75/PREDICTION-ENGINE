# Automatic Fundamentals Provider

**Status**: Unavailable (no reliable automatic source)

**Fallback**: `awaiting_operator_csv_export`

## Current State

| Source | Result | Issue |
|--------|--------|-------|
| `nsepython.nse_results("RELIANCE")` | ❌ Empty | Returns no data for any symbol |
| `nselib.financial_results_for_equity()` | ❌ Unavailable | Requires Python 3.10+ (PEP 604) |
| Public NSE/BSE results pages | ❌ Not machine-readable | Requires scraping / session |
| Official filings / XBRL | ❌ Not yet implemented | Future work |

## No Fake Fundamentals

The system does **not** generate fake or estimated fundamentals. Symbols without imported data display `awaiting fundamentals import` in the frontend.

## Fallback: CSV Import

| Source | Method |
|--------|--------|
| Screener.in | Manual CSV export → `data/fundamentals/` |
| Moneycontrol | Manual CSV export → `data/fundamentals/` |
| Operator spreadsheet | Custom CSV → `data/fundamentals/` |

See [fundamentals-import.md](./fundamentals-import.md) for import instructions.

## Future Work

| Task | Status |
|------|--------|
| XBRL parser for BSE/NSE filings | Planned |
| BSE filings API (if available) | Research |
| Python 3.10+ upgrade (enables nselib) | Considered |
