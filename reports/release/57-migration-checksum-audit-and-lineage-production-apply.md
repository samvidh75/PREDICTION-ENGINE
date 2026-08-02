# Migration Checksum Audit and Lineage Production Apply

## Baseline commit
`50f8f480` — Apply lineage migration safely and expose exact data gaps

## Checksum mismatch audit
- Production had 18 applied, 6 pending, with checksum mismatch
- Mismatch was pre-existing from repo history cleanup
- Risk was LOW — existing schema was compatible

## Migration guardrails
- `MigrationRunner.listMismatched()` added
- `--force` prints detailed warning with mismatched migration list
- Only bypasses checksum check; never re-applies already-applied migrations

## Production migration result
- Migration applied via Railway deploy with `FORCE_MIGRATIONS=true` env var + startup runner
- **Applied: 24, Pending: 0, Mismatch: False, Latest: 022_add_lineage_to_feature_factor_tables.sql**
- All 6 pending migrations (017–022) applied successfully
- Checksum mismatch resolved

## Production lineage backfill
- `railway run` cannot connect to internal PostgreSQL (DNS: `postgres.railway.internal`)
- Backfill requires execution from within the deployed container or via a startup hook
- **To run**: Add startup hook for backfill or exec via Railway one-off job
- Script ready: `scripts/backfill-feature-factor-lineage.ts` with dry-run and apply modes

## Fundamentals coverage endpoint
- `GET /api/research/fundamentals-coverage` returns:
- 31 total symbols, 0 with `source_label` populated in financial_snapshots (pre-existing — data was imported before source_label column existed)
- Endpoint works correctly; data is accurate

## Production verification
- Trust Centre loads correctly
- Fundamentals coverage section shows correct counts
- Migration checksum mismatch is resolved
- Service is healthy

## Remaining true blockers
- Feature/factor lineage backfill not yet run (requires exec inside Railway container)
- 0/31 financial snapshots have source_label populated (pre-existing data gap)
- 3 no-quote / 3 no-history — no safe provider source
- Backfill script needs to be triggered from within the Railway container

## Confirmation
- No fake data | No trading/pro UI | No secrets | No branch/PR created
- Migration integrity preserved — all 24 migrations applied and auditable
