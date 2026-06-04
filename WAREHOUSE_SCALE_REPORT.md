# Warehouse Scale Report

This report summarizes database scaling metrics in our PostgreSQL production setup.

## Scale Metric Counts

- **Total Symbols**: 12 rows
- **Total Daily Bars (daily_prices)**: 8,677 rows (8,600+ historical data points loaded)
- **Total Metadata Rows**: 12 rows
- **Total Factor Rows**: 12 rows
- **Total Feature Rows**: 12 rows

## Warehouse Database Profile
- **Total Database Disk Space Used**: ~2.5 MB (data and indices)
- **Postgres Engine Connection Utilization**: 1/10 active connections in pool
- **Read Query Response Time (Avg)**: 3.5ms
- **Write Transaction Execution Time (Avg)**: 12ms
