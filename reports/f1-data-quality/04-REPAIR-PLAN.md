# F1 Repair Plan

1. Run `npm run repair:invalid-prices -- --dry-run` and review counts by symbol and rejection reason.
2. Back up the target database before any apply-mode operation.
3. When approved, run `CONFIRM_F1_REPAIR_APPLY=true npm run repair:invalid-prices -- --apply`. This is quarantine-only: invalid OHLC rows are copied into `rejected_market_records` and remain preserved in `daily_prices` for traceability. The F1 scorer excludes them through validation.
4. Run `npm run repair:prediction-registry -- --dry-run` to identify sentinel, domain-invalid, and known template prediction rows.
5. When approved, run `CONFIRM_F1_REPAIR_APPLY=true npm run repair:prediction-registry -- --apply`. Historical `prediction_registry` rows remain immutable. Invalid rows are copied into `prediction_registry_quarantine`, and a `scoring_runs` audit marker is written.
6. Run `npm run pipeline:predictions -- --symbols=RELIANCE,HDFCBANK,INFY --dry-run` to inspect differentiated scores, completeness, lineage, peer-sector availability, identical-vector ratio, fallback ratio, and sentinel count.
7. Run `npm run check:score-collapse -- --universe=nifty50` against the current registry to preserve a baseline measurement.
8. Only after review, run `CONFIRM_F1_PIPELINE_APPLY=true npm run pipeline:predictions -- --universe=nifty50 --horizon=30 --apply`.
9. Apply mode refuses to append snapshots when calculated factor scores are invalid, collapse thresholds fail, or no complete snapshots are eligible for immutable registry promotion.
10. Keep external providers disabled until a documented or licensed API, export contract, attribution requirement, rate limit, and credential-handling policy are confirmed.
