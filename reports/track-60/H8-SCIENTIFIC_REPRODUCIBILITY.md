# Agent H — Scientific Reproducibility

## Verdict: ONE-COMMAND REPRODUCTION ESTABLISHED

## Command
```bash
npm run reproduce
# OR
sqlite3 data/stockstory.db < reports/track-60/reproduce_all.sql
```

## What Gets Reproduced
1. ✅ Data coverage (6 tables, row counts, date ranges)
2. ✅ Universe size (unique symbols)
3. ✅ Hit rates by horizon (30d/90d/365d)
4. ✅ Walk-forward 365d by year
5. ✅ Cheap Quality 30d hit rate
6. ✅ Model versions and prediction counts
7. ✅ Leakage audit (outcome columns outside approved tables)
8. ✅ Temporal integrity (look-ahead violations)
9. ✅ Confidence intervals (365d)
10. ✅ Sharpe ratio estimate

## Reproducibility Check
- All metrics in Trust Centre must match output of reproduce_all.sql
- All published claims must have corresponding query in reproduce_all.sql
- Any metric that fails reproducibility is flagged and removed from Trust Centre
