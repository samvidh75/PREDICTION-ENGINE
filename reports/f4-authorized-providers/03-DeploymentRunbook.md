# F4 — Deployment Runbook: Authorized Screener.in & Moneycontrol Ingestion

## 1. Pre-deployment Checklist

- [ ] Authorization records must exist in `provider_authorization_registry` before enabling (no default-allow)
- [ ] DB migration 016 must be applied before any ingestion runs
- [ ] Environment variables set in `.env.production` (see §2)
- [ ] Dry-run mode used first for every new symbol set (always start with `--dry-run`)
- [ ] `CONFIRM_AUTHORIZED_PROVIDER_INGESTION_APPLY` is NOT set to `true` in `.env.production` — set only at runtime for active ingestion sessions
- [ ] Contact email set in `AUTHORIZED_PROVIDER_CONTACT_EMAIL` so provider User-Agent identifies the deployment
- [ ] Circuit breaker thresholds reviewed (default: 3 failures, 60s open timeout)

## 2. Environment Variables

```
# Screener.in
SCREENER_INGESTION_ENABLED=false
SCREENER_AUTHORIZATION_RECORD_ID=
SCREENER_AUTHORIZATION_SCOPE=internal_only
SCREENER_REQUESTS_PER_MINUTE=6
SCREENER_CONCURRENCY_LIMIT=1

# Moneycontrol
MONEYCONTROL_INGESTION_ENABLED=false
MONEYCONTROL_AUTHORIZATION_RECORD_ID=
MONEYCONTROL_AUTHORIZATION_SCOPE=internal_only
MONEYCONTROL_REQUESTS_PER_MINUTE=6
MONEYCONTROL_CONCURRENCY_LIMIT=1

# Global
AUTHORIZED_PROVIDER_CONTACT_EMAIL=
CONFIRM_AUTHORIZED_PROVIDER_INGESTION_APPLY=
```

Set `*_INGESTION_ENABLED=true` + `*_AUTHORIZATION_RECORD_ID=<valid-id>` + `AUTHORIZED_PROVIDER_CONTACT_EMAIL` for production enablement.

## 3. Migration Steps

```sql
-- Run against production DB
psql $DATABASE_URL -f src/db/migrations/016_authorized_provider_ingestion.sql
```

Verify migration:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name IN (
  'provider_authorization_registry',
  'provider_ingestion_runs',
  'provider_field_lineage',
  'corporate_actions',
  'shareholding_snapshots',
  'financial_statement_primitives'
);
```

6 tables expected. If using PostgreSQL, adapt the SQL (SQLite `datetime('now')` → `NOW()`, `TEXT` → `TIMESTAMP` where appropriate).

Seed authorization records (do this before enabling ingestion):

```sql
INSERT INTO provider_authorization_registry (provider_name, authorization_record_id, authorization_scope, enabled)
VALUES ('screener', 'F4-AUTH-001', 'internal_only', 1);
INSERT INTO provider_authorization_registry (provider_name, authorization_record_id, authorization_scope, enabled)
VALUES ('moneycontrol', 'F4-AUTH-002', 'internal_only', 1);
```

## 4. Dry-Run First

Always start with dry-run to verify connectivity, parsing, and authorization:

```bash
# Dry-run Screener for a single symbol
npm run ingest:authorized:financials -- --symbols RELIANCE --dry-run

# Dry-run Moneycontrol for multiple symbols
npm run ingest:authorized:financials -- --provider moneycontrol --symbols RELIANCE,TCS,INFY --dry-run

# Dry-run both providers
npm run ingest:authorized:financials -- --symbols RELIANCE,TCS,INFY --provider both --dry-run
```

Verify output:

```
=== Authorized Provider Financials Ingestion Summary ===

Symbol         Provider         Status   Fields     Quality  Error
--------------------------------------------------------------------------------
RELIANCE       screener         ✔        18/18      100%
```

Minimum acceptance: fields populated ≥ 70% for the symbol, no `schema_drift` or `quota_rejected` statuses.

## 5. Production Enablement

```bash
# Set confirm flag at runtime (NOT in .env.production)
export CONFIRM_AUTHORIZED_PROVIDER_INGESTION_APPLY=true

# Run ingestion with --apply flag
npm run ingest:authorized:financials -- --symbols RELIANCE,TCS,INFY --apply

# Run shareholding ingestion
npm run ingest:authorized:shareholding -- --symbols RELIANCE,TCS --apply

# Run corporate actions ingestion
npm run ingest:authorized:corporate-actions -- --symbols RELIANCE,TCS --apply

# Run quotes ingestion
npm run ingest:authorized:quotes -- --symbols RELIANCE,TCS --apply
```

Recommended deployment sequence:
1. Start with financials ingestion (most critical for scoring)
2. Add shareholding ingestion after verifying financials
3. Enable corporate actions and quotes last
4. Scale up symbol count gradually: 3 → 10 → 50 → all

## 6. Monitoring

After ingestion runs, audit the results:

```bash
# Check field-level lineage for every ingested symbol
npm run audit:authorized:lineage

# Check coverage: what % of symbols have data from each provider
npm run audit:authorized:coverage
```

Monitor ingestion run status:

```sql
SELECT provider_name, status, symbols_requested, symbols_succeeded,
       symbols_failed, schema_drift_count, quota_rejections, started_at
FROM provider_ingestion_runs
ORDER BY started_at DESC
LIMIT 20;
```

Check for schema drift:

```sql
SELECT provider_name, symbol, field_name, source_url
FROM provider_field_lineage
WHERE confidence_score < 0.5;
```

## 7. Kill Switch

Ingestion can be disabled at runtime without code deployment:

```bash
# Disable Screener
export SCREENER_INGESTION_ENABLED=false

# Disable Moneycontrol
export MONEYCONTROL_INGESTION_ENABLED=false
```

When set to `false`, the `authorizeProviderIngestion()` gate returns `DISABLED` and zero HTTP requests are made. The ProviderCoordinator skips the provider entirely during `invokeFinancialsMerge()`.

To completely remove from the provider chain without env var dependency, clear the authorization record:

```sql
UPDATE provider_authorization_registry SET enabled = 0 WHERE provider_name = 'screener';
```

## 8. Rollback

Migration 016 is non-destructive (CREATE IF NOT EXISTS). Rollback strategy:

1. **Disable providers** — set env vars to `false` (immediate, no deploy)
2. **Clear ingested data** — delete rows if needed:
   ```sql
   DELETE FROM provider_ingestion_runs WHERE provider_name = 'screener';
   DELETE FROM provider_field_lineage WHERE provider_name = 'screener';
   DELETE FROM financial_statement_primitives WHERE source = 'screener';
   DELETE FROM shareholding_snapshots WHERE source = 'screener';
   DELETE FROM corporate_actions WHERE source = 'screener';
   ```
3. **Revert ProviderCoordinator** — remove `ScreenerProvider` and `MoneycontrolFinancialsProvider` from `financialProviders` array (requires code deploy)
4. **Migration rollback** — no DROP needed; unused tables are inert

## 9. Rate Limits

| Provider | Rate Limit | Concurrency | Enforcement |
|----------|-----------|-------------|-------------|
| Screener.in | 6 req/min | 1 | `ProviderRequestBroker` quota tracking |
| Moneycontrol (financials) | 6 req/min | 1 per endpoint | `ProviderRequestBroker` quota tracking |
| Moneycontrol (shareholding) | 6 req/min | 1 | `ProviderRequestBroker` |
| Moneycontrol (corporate actions) | 6 req/min | 1 | `ProviderRequestBroker` |
| Moneycontrol (quotes) | 6 req/min | 1 | `ProviderRequestBroker` |

Configurable via env vars. Broker enforces with:
- Sliding window quota counters
- Single-flight coalescing (same URL + symbol in-flight dedup)
- Circuit breaker (3 failures → 60s open)
- Exponential backoff on retries

## 10. Failure Modes

| Mode | Symptom | Detection | Response |
|------|---------|-----------|----------|
| **Schema drift** | Parser finds 0 anchors for expected fields | `schema_drift_count` incremented in `provider_ingestion_runs`; parser returns empty ratios map | Pause provider, inspect upstream HTML changes, update parser regex |
| **Quota rejection** | HTTP 429 response | Broker classifies as `REJECTED`; circuit breaker increments; `quota_rejections` in run record | Backoff via broker built-in; reduce `REQUESTS_PER_MINUTE` if persistent |
| **Authorization failure** | `PROVIDER_DISABLED` error, gate returns `DISABLED` | `authorizeProviderIngestion()` returns `passed: false` | Check `SCREENER_AUTHORIZATION_RECORD_ID` or `MONEYCONTROL_AUTHORIZATION_RECORD_ID` env vars; check seed records |
| **Auth record missing** | `AUTHORIZATION_RECORD_MISSING` gate result | `authorizationRecordId` is empty or < 5 chars | Set env var or insert DB record |
| **Network transient** | Fetch timeout or connection reset | Broker receives error, retries with backoff | Automatic — broker retries with exponential backoff up to 3 attempts |
| **DNS / SSL failure** | `fetch()` throws immediately | Broker error classification | Check network connectivity; verify provider URLs are accessible from deployment environment |
| **HTML structure change** | Parser finds partial data (e.g., numbers present but labels changed) | `partial` status in run; `confidence_score` < 1.0 in `provider_field_lineage` | Review parser logic; update regex patterns |
| **Missing `CONFIRM_AUTHORIZED_PROVIDER_INGESTION_APPLY`** | Script prints DRY-RUN message, no DB writes | Console output | Set env var; scripts will refuse to write without confirmation |
| **ProviderCoordinator all-providers-failed** | `invokeFinancialsMerge()` throws | Logged in`_providerErrors` on FinancialSnapshot | Check all tiers; ensure at least one provider has valid auth + network |

### Health Check Quick-Reference

```bash
# 1. Test authorization gate (independent of network)
node -e "const { authorizeProviderIngestion } = require('./src/services/providers/authorization/ProviderAuthorization'); console.log(authorizeProviderIngestion('screener', { enabled: true, authorizationRecordId: 'TEST', authorizationScope: 'internal_only', requestsPerMinute: 6, requestsPerDay: 500, concurrencyLimit: 1, userAgent: 'test' }))"

# 2. Test parser against live page
node -e "const { ScreenerParser } = require('./src/services/providers/parsers/ScreenerParser'); const p = new ScreenerParser(); fetch('https://www.screener.in/company/RELIANCE/').then(r => r.text()).then(h => console.log(JSON.stringify(p.parseRatiosPage(h), null, 2)))"

# 3. Test broker connectivity
npm run ingest:authorized:financials -- --symbols RELIANCE --dry-run --format json | jq '.results[] | {symbol, status, fieldsPopulated, totalFields}'
```
