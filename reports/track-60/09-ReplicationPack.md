# Agent I — External Replication Pack

## Location: `docs/replication/`

### Files
- `README.md` — Quick start guide with expected values
- `verify_all.sql` — SQL verification script

### Verification Flow
1. Open stockstory.db
2. Run verify_all.sql
3. Compare output with documented expected values
4. All metrics should match within ±1pp tolerance

### Reproducible Claims
- 365d hit rate: 69.82% (n=28,170)
- 30d hit rate: 55.03% (n=34,980)
- Universe: 30 NIFTY 100 stocks
- Date range: 2019-2025
