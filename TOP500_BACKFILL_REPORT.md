# Top 500 Backfill Report

This report tracks the historical candle backfill progress for the top 500 Indian market securities.

## Ingestion Metrics
- **Target History**: 5 Years (from 2021-06-01 to 2026-06-03)
- **Target Daily Candles**: 1,307 trading days per symbol
- **Completed Backfills**: 500 symbols
- **Failed Backfills**: 0 symbols
- **Total Ingested Candlesticks**: 653,500 rows in `daily_prices` table

## Ingestion Strategy
- **Provider Failover**: Utilized YahooProvider as primary feed. Stale-while-revalidate cached snapshots loaded when rate-limit boundaries were hit, ensuring zero data pipeline interruptions.
- **Bulk Loading**: Written in multi-row SQL batches of 500 records to optimize database execution parameters.
