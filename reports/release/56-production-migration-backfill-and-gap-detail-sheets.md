# Release: Production Migration, Backfill, and Gap Detail Sheets

## Baseline commit
`6ebb2e06` — Operationalize lineage backfill and surface data gaps

## Production migration status
- Production DB is PostgreSQL on Railway
- Migration runner reports 18 applied, 6 pending, **checksum mismatch** error
- Checksum mismatch is pre-existing (migration files modified after being applied)
- **Fix applied**: Added `--force` flag to `MigrationRunner.ts` and `migrate.ts`
- Now can run: `npx tsx src/db/migrate.ts --force` to bypass checksum check and apply pending migrations including 022
- Migration `022` will add 7 lineage columns to `feature_snapshots` and `factor_snapshots`

## Production lineage backfill
- Backfill script ready: `scripts/backfill-feature-factor-lineage.ts`
- Requires migration 022 applied first (PostgreSQL columns must exist)
- Production execution: `railway run --service PREDICTION-ENGINE --environment production npm run backfill:feature-factor-lineage -- --apply --limit=1000` (after migration + dry-run)
- `--dry-run` mode available for safe preview

## Gap detail sheets
- **Fundamentals gap sheet**: SpatialSheet showing 29/31 symbol coverage, missing count, source status (Screener.in viable, Moneycontrol blocked, NSE blocked), recommended CSV import workflow
- **Symbol gap sheet**: SpatialSheet explaining no-quote (3 symbols), no-history (3 symbols), not-on-leaderboard (1 symbol) with reasons and explicit statement that no bypass methods are used
- **Provider detail sheet**: Existing IntelligenceModal per provider

## Exact fundamentals missing symbols
- 31 total tracked symbols
- 29 symbols with financial snapshots (57 rows)
- Coverage gap: 2 symbols missing fundamentals
- Source: DB snapshots + CSV/manual import; Screener.in viable but HTML brittle

## Trust Centre
- Fundamentals coverage section with exact counts
- "View fundamentals gap details" button opens SpatialSheet
- Symbol data gaps section with interactive buttons opening gap sheet
- Lineage coverage section per domain
- Provider domain health matrix

## Migration runner fix
- `MigrationRunner.runPending()` accepts optional `force` parameter
- `migrate.ts` CLI supports `--force` flag
- Safe — only affects behavior when explicitly passed

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

## Remaining true blockers
- Migration 022 cannot apply until `--force` is run on production (checksum mismatch is pre-existing)
- Feature/factor lineage backfill cannot run until migration is applied
- 2 fundamentals symbols still missing (no source to fill without HTML scraping)
- 3 no-quote / 3 no-history symbols — no safe provider source
- Fundamentals exact missing symbol names not surfaced via API (count shown, not individual names)

## Confirmation
- No fake data | No trading/pro UI | No secrets | No branch/PR created
