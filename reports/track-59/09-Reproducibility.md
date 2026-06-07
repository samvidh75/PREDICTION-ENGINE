# Agent I — Research Reproducibility

## Verdict: All claims independently verifiable via SQL

### Run: `reports/track-59/reproduce_results.sql` against stockstory.db

### Verified Results (current)
- **365d hit rate**: 69.82% (n=28,170)
- **30d hit rate**: 55.03% (n=34,980)
- **Cheap Quality 30d hit rate**: 59.05% (n=2,332)
- **Total validated predictions**: 96,960
- **Unique symbols**: 30
- **Date range**: 2021-08-17 to 2026-05-06

### Reproducibility Checklist
- [x] 365d accuracy claim verifiable
- [x] 30d hit rate verifiable
- [x] Cheap Quality hit rate verifiable
- [x] Walk-forward by year verifiable
- [x] Quality V5 scores verifiable
- [x] Full SQL audit trail in reproduce_results.sql
