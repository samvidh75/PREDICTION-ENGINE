# Recovery: Database Offline
## Symptom
`ECONNREFUSED localhost:5432` or `connect ECONNREFUSED`

## Steps (Windows)
1. Check PostgreSQL installed: `where psql`
2. Check service: `sc query postgresql-x64-16`
3. Start service: `net start postgresql-x64-16`
4. Verify port: `netstat -an | findstr 5432`
5. Connect: `psql -U postgres -d stockstory`

## If PostgreSQL not installed
`choco install postgresql` or download from postgresql.org

## Verify DB
`SELECT COUNT(*) FROM master_security_registry;`