# Production Maintenance Execution Results

## Baseline commit
`f6829771` (executed at `e74015dc`)

## Coverage diagnostics (before)
- Total: 31 symbols
- Fundamentals: 29 symbols, 57 rows
- Fundamentals with source_label: 0/29
- Prediction input lineage rows: 0
- Feature/factor lineage: pending backfill

## Lineage backfill dry-run
- feature_snapshots: scanned 100, matched 0, skipped 100
- factor_snapshots: scanned 100, matched 0, skipped 100
- **Not applied** — `prediction_input_lineage` has 0 rows in production (ingestion scripts haven't run). All rows would be marked `lineage_unavailable`.

## Fundamentals metadata dry-run
- 57 rows missing source_label
- Sample: ITC, RELIANCE, HINDUNILVR, TCS, TATASTEEL, and others

## Fundamentals metadata apply
- Applied with `source_label="Manual CSV import"` (operator-confirmed provenance)
- Updated 29 symbols, 57 rows
- Source labels now populated for all financial snapshots

## Coverage diagnostics (after)
- Total: 31 symbols
- Fundamentals: 29 symbols, 57 rows
- Fundamentals with source_label: 29/29 ✅
- Prediction input lineage rows: 0
- Feature/factor lineage: pending backfill (requires prediction_input_lineage population)

## Production fundamentals coverage endpoint
- `/api/research/fundamentals-coverage`: 31 total, 29 covered, 2 missing (LT, M&M)
- Trust Centre now shows correct coverage with exact missing symbols

## Maintenance env cleanup
- All RUN_MAINTENANCE_* and MAINTENANCE_EXIT_AFTER_RUN env vars deleted

## Remaining true blockers
- Feature/factor lineage backfill not applied (0 prediction_input_lineage rows — needs ingestion pipeline to run first)
- LT and M&M have no financial snapshots at all (need fundamentals import)
- 3 no-quote / 3 no-history — no safe provider source
- Prediction input lineage has 0 rows in production (ingestion pipeline hasn't populated it)

## Confirmation
- No fake data | No trading/pro UI | No secrets | No branch/PR
- All source labels are operator-confirmed ("Manual CSV import"), not auto-discovered provider sources
- No fake completion on fundamentals — 2 symbols genuinely missing snapshots
