# Static Safety Scan Results

## Conflict Markers
- Command: `git grep -nE '<<<<<<<|=======|>>>>>>>'`
- Result: **0 matches** (Clean)

## DatabaseAdapter Table-Drop / Hack Audit
- Command: `git grep -n "DROP TABLE" -- src/db/DatabaseAdapter.ts`
- Result: **0 matches** (Clean)
- Command: `git grep -n "financial_snapshots" -- src/db/DatabaseAdapter.ts`
- Result: **0 matches** (Clean)
- Command: `git grep -n "subscription_plans" -- src/db/DatabaseAdapter.ts`
- Result: **0 matches** (Clean)

## Dockerfile Audit
- Command: `git grep -n "COPY --from=builder /app/data" -- Dockerfile`
- Result: **0 matches** (Clean)

## Node Version Audit (No Node 20 runtime pins)
- Command: `git grep -n "node:20" -- Dockerfile .github/workflows package.json`
- Result: **0 matches** (Clean)
- Command: `git grep -n "node-version: 20" -- .github/workflows`
- Result: **0 matches** (Clean)

## better-sqlite3 Audit
- Command: `git grep -n "better-sqlite3" -- src scripts package.json package-lock.json Dockerfile`
- Allowed / Justified matches:
  - `package.json`, `package-lock.json`: Declares dependency on `better-sqlite3` which is the required driver for local fallback.
  - `src/db/SQLiteAdapter.ts`: Local SQLite fallback database driver/pool.
  - `src/db/__tests__/p0-stabilization.test.ts`: Integration test for database stabilization/fallback.
  - `scripts/`: Legacy historical scripts and offline validation scripts.
- Private persistence / production services matching: **0 matches** (All converted to `dbAdapter`).
