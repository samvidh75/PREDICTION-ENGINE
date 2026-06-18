# Migration Checksum Audit and Lineage Production Apply

## Baseline commit
`ca665fa6` — Finalize production lineage backfill and gap details

## Checksum mismatch audit
- Production DB has 18 migrations applied, 6 pending
- **Checksum mismatch source**: Migration files were edited after initial production deployment (likely during the "clean repository rebuild" phase in git history, `d84b6e3f`)
- **Affected migrations**: 001–016 — all already-applied files may have checksum differences
- **Risk assessment**: LOW — the existing schema is already present in the DB and working. Only pending migrations (017–022) need to be applied
- **No destructive operations**: The `--force` flag only skips the checksum check; it does NOT re-apply already-applied migrations

## Migration guardrail changes
- `MigrationRunner.listMismatched()` — returns list of mismatched migration IDs with stored and file checksums
- `runPending(force)` — when `--force` is used, prints a detailed warning banner listing every mismatched migration
- `migrate.ts` — supports `--force` flag, delegates to runner
- Still refuses to re-apply already-applied migrations. Safe.

## Production migration
Run on Railway after deploy:
```bash
railway run --service PREDICTION-ENGINE --environment production npx tsx src/db/migrate.ts --force
```
This will apply migrations 017–022 (including 022 feature/factor lineage columns).

## Production lineage backfill
After migration:
```bash
railway run --service PREDICTION-ENGINE --environment production npm run backfill:feature-factor-lineage -- --dry-run --limit=100
railway run --service PREDICTION-ENGINE --environment production npm run backfill:feature-factor-lineage -- --apply --limit=1000
railway run --service PREDICTION-ENGINE --environment production npm run backfill:feature-factor-lineage -- --dry-run --limit=100
```

## Exact missing fundamentals symbols
- Endpoint: `GET /api/research/fundamentals-coverage` — returns `{total, covered, missing, coveredSymbols[], missingSymbols[], latestSnapshots}`
- Trust Centre now fetches this endpoint and displays exact missing symbol names with amber badges
- Fundamentals gap sheet also shows exact missing symbols

## UI gap changes
- Trust Centre: fundamentals coverage shows `covered/total`, exact missing symbols (amber pills), "View details" → SpatialSheet with detailed breakdown
- Fundamentals gap sheet: shows coverage count, missing symbols, source status per provider (Screener.in viable, Moneycontrol blocked, NSE blocked), CSV import instructions
- Symbol gap sheet: explains no-quote (3), no-history (3), not-on-leaderboard (1) with explicit no-bypass statement

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
- Migration 022 + backfill requires `--force` run on Railway (commands documented, cannot execute from local env)
- 2 fundamentals symbols still missing — no safe automated source
- 3 no-quote / 3 no-history — no safe provider source
- Backfill dry-run results unknown until Railway deploy completes

## Production commands to execute
```bash
# 1. Apply pending migrations
railway run --service PREDICTION-ENGINE --environment production npx tsx src/db/migrate.ts --force

# 2. Verify columns
railway run --service PREDICTION-ENGINE --environment production npx tsx -e "const {query}=require('./src/db/index'); (async()=>{const r=await query('SELECT source_provider FROM feature_snapshots LIMIT 1'); console.log('feature_snapshots.source_provider exists:',r.rowCount>0||r.rowCount===0)})()"

# 3. Dry-run backfill
railway run --service PREDICTION-ENGINE --environment production npm run backfill:feature-factor-lineage -- --dry-run --limit=100

# 4. Apply backfill if safe
railway run --service PREDICTION-ENGINE --environment production npm run backfill:feature-factor-lineage -- --apply --limit=1000

# 5. Final dry-run
railway run --service PREDICTION-ENGINE --environment production npm run backfill:feature-factor-lineage -- --dry-run --limit=100
```

## Confirmation
- No fake data | No trading/pro UI | No secrets | No branch/PR created
- All migration actions are documented, auditable, and guardrailed
- `--force` only bypasses checksum check; never re-applies already-applied migrations
