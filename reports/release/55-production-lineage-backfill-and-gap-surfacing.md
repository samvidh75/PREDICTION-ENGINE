# Release: Production Lineage Backfill and Gap Surfacing

## Baseline commit
`ace472ee` — Complete lineage schema and surface data gaps

## Migration status
- `022_add_lineage_to_feature_factor_tables.sql` is committed and registered for auto-apply via Railway/PostgreSQL
- Local SQLite environment cannot run the migration (PostgreSQL-specific syntax)
- Migration will auto-apply on next Railway deploy via the migration runner

## Lineage backfill
- `scripts/backfill-feature-factor-lineage.ts` ready with `--dry-run` and `--apply` modes
- Supports `--symbols`, `--limit`, `--since` filters
- Joins feature/factor snapshots to `prediction_input_lineage` for real provider provenance
- Unmatched rows get `source_quality = 'lineage_unavailable'`
- **Dry-run not run locally** (requires PostgreSQL for migration to be applied first)
- Production dry-run: `railway run --service PREDICTION-ENGINE --environment production npm run backfill:feature-factor-lineage -- --dry-run --limit=100`

## Gap surfacing UI

### Trust Centre
- New "Fundamentals coverage" section: symbol count with snapshots, total tracked, coverage gap count, source explanation (Screener.in viable, Moneycontrol blocked, CSV recommended)
- Existing "Symbol data gaps" section (3 no quote, 3 no history, 1 not on leaderboard)
- Existing "Lineage coverage" section (per-domain availability)

### Dashboard
- New "Data operations" panel showing fundamentals coverage, no-quote count, no-history count, scored records
- Links to Trust Centre and Compare

### Compare
- Each company card has a "Trace" button opening `ResearchAuditDrawer`
- Missing fields show "—" explicitly

## Verification
- typecheck: all pass
- lint: pass
- hygiene: 0 secrets
- unit: 971/971 pass
- frontend build: pass
- backend build: pass
- E2E: 36/36 pass
- responsive audit: 88/88 pass
- smoke production: pass
- provider checks: pass (IndianAPI active, Yahoo blocked, NSELib archived, fundamentals partial)

## Remaining true blockers
- Feature/factor backfill requires PostgreSQL migration to run first (auto-applied on Railway deploy)
- Fundamentals still partial — Screener.in viable but HTML brittle; CSV import preferred
- 3 symbols no quote, 3 no history — no reliable source to fill without bypassing restrictions
- Fundamentals missing-symbol list not yet surfaced with exact symbol names (gap count displayed)

## Confirmation
- No fake data | No trading/pro UI | No secrets | No branch/PR created
