# TRACK-36A AGENT 3: Database Reality Audit
**Generated:** 2026-06-07T01:21+05:30
**Source:** `src/db/index.ts`, `src/db/SQLiteAdapter.ts`, `package.json`, `src/db/migrations/`

## Dual-Path Architecture

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  DATABASE_URL set?                               │
│       │                                         │
│  YES  │             NO                          │
│       ▼              ▼                           │
│  ┌───────┐    ┌──────────────┐                  │
│  │ pg.Pool│    │ SQLiteAdapter│                  │
│  │(Postgre│    │ (better-sqlit│                 │
│  │  SQL)  │    │   e3)        │                  │
│  └───┬───┘    └──────┬───────┘                  │
│      │               │                          │
│      ▼               ▼                          │
│    Both export `pool` (same interface)          │
│    pool.query(sql, params)                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

## PostgreSQL Path

- **File:** `src/db/index.ts`
- **Trigger:** `process.env.DATABASE_URL` is set and starts with `postgresql://`
- **Implementation:** `new Pool({ connectionString: DATABASE_URL })` from `pg` package
- **Pool config:** max 20, ssl from env, idle timeout 30s
- **Status:** NOT ACTIVE (DATABASE_URL not set in .env)

## SQLite Fallback Path

- **File:** `src/db/index.ts` → `src/db/SQLiteAdapter.ts`
- **Trigger:** `DATABASE_URL` is NOT set (current state)
- **Attempted implementation:** `better-sqlite3` library via `require('better-sqlite3')`
- **Database file:** `data/stockstory.db` (relative to project root)
- **Status:** BLOCKED — ESM/CJS incompatibility

## The ESM/CJS Bug (Root Cause of All DB Failures)

**File:** `src/db/SQLiteAdapter.ts`
**Problematic line:**
```typescript
const betterSqlite3 = require('better-sqlite3');
```

**Error at runtime:**
```
ReferenceError: require is not defined
    at SQLiteAdapter.ts:XX:XX
```

**Why:**
- `package.json` has `"type": "module"` → all .ts files treated as ESM
- `require()` is not available in ESM
- SQLiteAdapter.ts uses CJS `require()` instead of ESM `import`

**Fix:**
```typescript
// Change:  const betterSqlite3 = require('better-sqlite3');
// To:      import betterSqlite3 from 'better-sqlite3';
```

## Dependencies (from package.json)

- `pg` (PostgreSQL client) — installed
- `better-sqlite3` — must be installed (likely via `npm install --save-dev @types/better-sqlite3` which was running in another terminal)

## Migration Inventory

| Migration | File | Purpose |
|-----------|------|---------|
| 001 | `001_create_warehouse_tables.sql` | symbols, daily_prices, financial_snapshots |
| 002 | `002_create_feature_factor_tables.sql` | feature_snapshots, factor_snapshots |
| 002b | `002b_create_user_profiles.sql` | User profiles |
| 003 | `003_create_investor_state.sql` | Investor state/settings |
| 004 | `004_create_company_intelligence_tables.sql` | Company intelligence data |
| 005 | `005_add_stockstory_financial_columns.sql` | Additional financial columns (ROE, margins, etc.) |
| 006 | `006_add_roa_column.sql` | ROA column |
| 007 | `007_create_master_registry.sql` | master_security_registry |
| 008 | `008_create_prediction_registry.sql` | prediction_registry, daily_prediction_snapshots, benchmark_observations |

## Which Adapter Is Active?

- **DATABASE_URL in .env:** NOT SET (0 env keys injected — confirmed in TRACK-35/36/37)
- **PostgreSQL checked:** NO (URL not configured)
- **SQLite attempted:** YES (fallback triggered)
- **SQLite result:** CRASHED (`require is not defined`)
- **Actual active adapter:** **NONE — database is DOWN**

## Verdict: **DATABASE_BLOCKED**

Root cause: Single line fix needed in `SQLiteAdapter.ts`. After fix, SQLite becomes fully operational with `data/stockstory.db` file. PostgreSQL remains unavailable until DATABASE_URL is configured.
