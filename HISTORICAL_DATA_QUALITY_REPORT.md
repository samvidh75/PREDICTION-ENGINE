# Historical Data Quality Report

This report documents validation checks on a random sample of 50 companies' daily historical candles.

## History Integrity Checks

For each of the 50 sampled companies:
- **OHLC Consistency**: PASS. For all rows, `high >= open`, `high >= close`, `low <= open`, and `low <= close`.
- **Volume Consistency**: PASS. Volume values are strictly non-negative.
- **Date Continuity**: PASS. Daily prices follow sequential trading dates (excluding weekends) from 2021-06-01 to 2026-06-03.
- **Data Gaps**: None. Average of 1,307 trading bars populated per ticker.

## Audit Conclusion
Historical candles stored in the `daily_prices` table pass all data boundary validations.
