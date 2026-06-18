# Release: Lineage Schema, Trust Centre Gaps, and Premium Polish

## Baseline commit
`b6fd0132` — Eliminate data blind spots and complete compare intelligence workflows

## Migration summary
- Created `022_add_lineage_to_feature_factor_tables.sql`
- Adds to `feature_snapshots`: `source_provider`, `source_domain`, `source_as_of_date`, `source_ingested_at`, `source_lineage_id`, `source_quality` (CHECK: verified/inferred/lineage_unavailable/manual), `source_notes`
- Adds to `factor_snapshots`: same columns and constraints
- Indexes on `source_provider` for both tables
- Follows existing migration conventions (idempotent ALTER TABLE ADD COLUMN IF NOT EXISTS)

## Lineage backfill
- Created `scripts/backfill-feature-factor-lineage.ts`
- Dry-run support (`--dry-run`), apply mode (`--apply`), symbol filter, limit, date range
- Joins feature/factor snapshots to prediction_input_lineage where possible
- Unmatched rows get `source_quality = 'lineage_unavailable'`
- Reports scanned/matched/unmatched/errors

## Lineage endpoint changes
- `/api/research/lineage/:symbol` now includes feature/factor lineage from new columns
- Also includes daily_prices coverage count
- Response contains `featureLineageCount`, `factorLineageCount`, `fundamentalsLineageCount`, `priceCoverage`

## Compare deep lineage
- Each company card now has a "Trace" button
- Opens `ResearchAuditDrawer` per company — full source audit in SpatialSheet
- Drawer shows lineage entries, model run, data completeness

## Trust Centre gap UI
- Added "Symbol data gaps" section: 3 no quote, 3 no history, 1 not on leaderboard
- Added "Lineage coverage" section: per-domain status (available/partial/unavailable) with detail

## Verification
- typecheck: all pass
- lint: pass
- hygiene: 0 secrets
- unit: 971/971 pass
- frontend build: pass
- backend build: pass
- E2E: 36/36 pass
- responsive audit: 88/88 pass
- smoke: pass

## Remaining true blockers
- Feature/factor backfill requires migration to be run and dry-run to succeed before apply
- Fundamentals still partial — Screener.in viable but HTML brittle; CSV import preferred
- 3 symbols no quote, 3 no history — no reliable source to fill
- Fundamentals missing-symbol list not yet surfaced in Trust Centre UI

## Confirmation
- No fake data | No trading/pro UI | No secrets | No branch/PR created
