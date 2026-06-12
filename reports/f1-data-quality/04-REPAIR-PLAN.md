# F1 Repair Plan

1. Run `npm run repair:invalid-prices -- --dry-run` and review counts by symbol and reason.
2. If accepted, run `npm run repair:invalid-prices -- --apply` to quarantine invalid OHLC rows in `rejected_market_records` before deleting only invalid rows.
3. Run `npm run repair:prediction-registry -- --dry-run` to identify sentinel/domain/template prediction rows.
4. Preserve historical prediction rows. In apply mode, write audit markers to `scoring_runs` instead of silently deleting.
5. Run `npm run pipeline:predictions -- --symbols=RELIANCE,HDFCBANK,INFY --dry-run` to confirm differentiated scoring and lineage.
6. Only use apply mode when `CONFIRM_F1_PIPELINE_APPLY=true` is set.

