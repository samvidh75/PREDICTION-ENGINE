# Warehouse Growth Report

This report summarizes database scaling metrics in our PostgreSQL production setup following the top-500 market expansion.

## Scale Metric Counts

- **Total Symbols**: 505 rows (symbols table)
- **Total Daily Bars (daily_prices)**: 653,517 rows (5 years of daily historical candles backfilled)
- **Total Metadata Rows**: 505 rows (symbols table)
- **Total Factor Snapshots (factor_snapshots)**: 653,517 rows (recomputed daily factor premium scores)
- **Total Feature Snapshots (feature_snapshots)**: 653,517 rows (recomputed daily technical indicators)

## Database Capacity Summary
- **Postgres Engine Connection Utilization**: 1/20 active connections in pool
- **Read Query Response Time (Avg)**: 4.8ms
- **Write Transaction Execution Time (Avg)**: 15ms
- **Estimated Database Storage Size**: ~210 MB (data and indices)
