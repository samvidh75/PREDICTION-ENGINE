# Fundamentals Import — StockStory India

## Overview

Fundamentals (financial statements, ratios, company data) for StockStory India are sourced through **operator-provided data imports**. Public NSE providers (nselib, nsepython) could not reliably provide structured financial results — nselib requires Python 3.10+, and nsepython's `nse_results()` returns no data.

## Data Sources

| Source                          | Type     | Status      |
|---------------------------------|----------|-------------|
| Operator CSV export             | Primary  | Ready       |
| Screener.in export              | Optional | Permitted   |
| Moneycontrol export             | Optional | Permitted   |
| BSE/NSE official filings parser | Planned  | Not built   |
| nselib financial_results       | N/A      | Requires Python 3.10+ (unavailable) |
| nsepython nse_results          | N/A      | Returns no data |

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
- Public NSE providers (nselib, nsepython) do not provide fundamentals on current infrastructure.
- Broker APIs do not populate fundamentals fields.

## Limitations

- nselib (`financial_results_for_equity`) requires Python 3.10+ (current: 3.9.6)
- nsepython (`nse_results()`) returns no data — NSE API restrictions
- Fundamentals must be supplied via operator export or trusted third-party source
