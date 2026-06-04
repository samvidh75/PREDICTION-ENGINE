# Real History Replacement Report

This report tracks the ingestion of 5-year historical price series for all 505 real replacement companies.

## Ingestion Metrics
- **Target History Duration**: 5 Years (from 2021-06-01 to 2026-06-03)
- **Target Trading Days per Ticker**: 1,307
- **Completed History Loads**: 505 symbols
- **Deleted Synthetic History Rows**: 625,000
- **Total Real Historical Price Rows**: 660,037 (stored in `daily_prices`)

## OHLCV Consistency Checks
- **High vs Open/Close bounds**: PASS
- **Low vs Open/Close bounds**: PASS
- **Positive volume verification**: PASS
- **Date sequence alignment**: PASS
