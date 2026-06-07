# AGENT B — Database Migration Plan

## Current: SQLite (better-sqlite3)
12 tables, WAL mode, embedded database.

## Target: PostgreSQL

### Schema Compatibility
| Table | SQLite Type | PostgreSQL Type | Compatible |
|-------|------------|----------------|------------|
| symbols | TEXT | VARCHAR | ✅ |
| daily_prices | REAL | NUMERIC | ✅ |
| factor_snapshots | REAL | NUMERIC | ✅ |
| prediction_registry | TEXT UUID | UUID | ✅ (add uuid-ossp) |
| pipeline_health | TEXT | TEXT | ✅ |

### Migration Scripts
1. pg_dump schema from SQLite (via better-sqlite3 introspection)
2. CREATE TABLE statements for PostgreSQL
3. COPY data via CSV export/import
4. Create indexes (symbol + trade_date composites)
5. Create triggers for updated_at timestamps

### Rollback Plan
- Keep SQLite file as backup during migration
- Dual-write during transition period (write to both DBs)
- Rollback: point config back to SQLite path

### Downtime Estimate: 15-30 minutes
For current data volume (< 1000 symbols, ~100K rows per table)

### Risk Assessment: LOW
- Both DBs support same query patterns
- Parameterized queries already used throughout
- No database-specific SQL features used (no triggers, views, stored procs)
