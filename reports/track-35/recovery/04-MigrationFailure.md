# Recovery: Migration Failure

## Check migration status
`SELECT * FROM information_schema.tables WHERE table_schema = 'public';`

## Run individual migration
1. Locate migration: `src/db/migrations/007_create_master_registry.sql`
2. Run: `psql -U stockstory_user -d stockstory -f src/db/migrations/007_create_master_registry.sql`

## Recover from partial migration
1. Check for orphaned tables/columns
2. Drop incomplete: `DROP TABLE IF EXISTS table_name CASCADE;`
3. Re-run migration from start

## Migration files
- 006: add roa column
- 007: master_security_registry
- 008: prediction_registry + related tables