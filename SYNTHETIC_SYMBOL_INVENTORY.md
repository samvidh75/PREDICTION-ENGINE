# Synthetic Symbol Inventory Report

This report documents the inventory of synthetic assets that have been purged and replaced in the warehouse database.

## Purged Inventory Statistics

- **Total Synthetic Symbols**: 475 symbols
- **Purged Metadata Rows**: 475 rows
- **Purged Historical Price Rows**: 625,000 daily candles (purged completely via TRUNCATE CASCADE)

## Purged Candidates List
- **Format**: Dynamic combinatorial keys (e.g. `ADANIPOWER`, `BAJAJGREEN`, `BIRLACHEM`, `SHREEMIN_1` etc.).
- **Status**: Purged from `symbols`, `daily_prices`, `financial_snapshots`, `feature_snapshots`, and `factor_snapshots` tables.
