# Fundamentals Import — StockStory India

## Overview

Fundamentals (financial statements, ratios, company data) for StockStory India are sourced through **DB financial snapshots** (57 rows across 29 symbols from pipeline runs) supplemented by **operator-provided data imports** for gaps. No public NSE provider currently delivers reliable structured fundamentals — nselib is archived (evaluated and not active), nsepython's `nse_results()` returns no data, and jugaad-data does not provide fundamentals.

## Data Sources

| Source | Type | Status |
|--------|------|--------|
| DB financial snapshots (57 rows, 29 symbols) | Pipeline | Partial coverage |
| Operator CSV export | Manual | Ready — fills gaps |
| Screener.in export | Optional | Permitted |
| Moneycontrol export | Optional | Permitted |
| BSE/NSE official filings parser | Planned | Not built |
  | nselib `financial_results_for_equity` | Archived | Evaluated and not active — see nselib-provider.md |
  | nsepython `nse_results()` | N/A | Returns no data |
  | jugaad-data | N/A | Does not provide fundamentals |

## Automatic Fundamentals

There is currently **no reliable automatic source** for fundamentals:

| Attempt | Result |
|---------|--------|
| `nsepython.nse_results("RELIANCE")` | Empty — no data returned |
| `nselib.financial_results_for_equity("RELIANCE")` | Archived — evaluated and not active (see [nselib-provider.md](./nselib-provider.md)) |
| Public NSE/BSE results pages | Not machine-readable without scraping |
| Official filings / XBRL | Not yet implemented |

No fake or estimated fundamentals are generated. See [automatic-fundamentals-provider.md](./automatic-fundamentals-provider.md).

## CSV Import Instructions

### 1. Export CSV

Export fundamental data from a permitted source:

| Source | How to Export |
|--------|--------------|
| Screener.in | Open company page → Download CSV |
| Moneycontrol | Open financials page → Export to CSV |
| Other | Any CSV matching the schema below |

### 2. Place File

Place the CSV file in `data/fundamentals/`:

```bash
cp /path/to/export.csv data/fundamentals/<symbol>-<date>.csv
```

### 3. Validate

```bash
npm run validate:fundamentals -- --file=data/fundamentals/<symbol>-<date>.csv
```

### 4. Import

```bash
npm run import:fundamentals -- --file=data/fundamentals/<symbol>-<date>.csv
```

### 5. Verify

Check the frontend or run:

```bash
npm run verify:data:production
```

## Import Pipeline

1. Operator exports fundamentals CSV from Screener/Moneycontrol
2. File is placed in `data/fundamentals/`
3. Script normalizes and validates against the required schema
4. Data is imported into `financial_snapshots` table
5. Frontend displays imported values with source label

## Validation

```bash
npm run validate:fundamentals -- --file=<path-to-csv>
```

## Schema

The `financial_snapshots` table stores:

- `symbol` — NSE ticker
- `snapshot_date` — period end date
- `period_type` — annual/quarterly
- `metrics_json` — structured financial data
- `source_label` — Screener/Moneycontrol/manual
- `source_url` — original source if applicable

## Frontend Display

- Symbols with imported fundamentals show real values with source labels.
- Symbols without fundamentals show `awaiting fundamentals import`.
- No fake or estimated fundamentals are shown.
- Public NSE providers (nselib, nsepython, jugaad-data) do not provide fundamentals on current infrastructure.
- Broker APIs do not populate fundamentals fields.

## Limitations

| Issue | Detail |
|-------|--------|
| nselib | Archived — `financial_results_for_equity` does not return usable data even on Python 3.12 (see [nselib-provider.md](./nselib-provider.md)) |
| nsepython | `nse_results()` returns no data — NSE API restrictions |
| jugaad-data | Does not provide fundamentals at all |
| Automation | No reliable automatic source; all imports are manual |
