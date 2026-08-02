# Provider Status Classification and Fundamentals Schema Migration

**Baseline commit**: `00eecf63`
**Date**: 2026-06-17

---

## Summary

Fixed provider/env status classification so deprecated/optional providers don't appear as app blockers. Applied fundamentals schema migration 021 to Railway Postgres. Updated frontend Trust Centre to show structured provider status.

---

## Provider Requirement Matrix

| Provider | Lifecycle | Required | Status | Blocking |
|---|---|---|---|---|
| Finnhub | **deprecated** | No | disabled | No |
| IndianAPI | **active** | **Yes** | healthy/missing_required | Yes if missing |
| Upstox (token) | **optional** | No | present/missing_optional | No |
| Upstox (OAuth config) | **optional_refresh** | No | present/missing_optional | No |
| Upstox (notifier) | **optional_notifier** | No | present/missing_optional | No |
| Redis | **active** | **Yes** | healthy/missing_required | Yes if missing |

### Finnhub: deprecated, not required
- Lifecycle set to `"deprecated"`, required `false`, status `"disabled"`
- Never shown as a blocker in health/data-coverage endpoints
- Frontend shows as "Deprecated" with muted styling
- .env.example already marked as removed from active pipeline

### Upstox: optional/degraded
- Lifecycle set to `"optional"`, required `false`
- Missing token = `"missing_optional"`, not `"missing_required"`
- Frontend shows as "Optional" with muted styling
- Expired token reported separately via `check:upstox` script

### IndianAPI: active
- Lifecycle set to `"active"`, required `true`
- Present = `"healthy"`, missing = `"missing_required"`
- Fundamentals plan limitation handled separately (provider_plan_limited)

### Redis: active (required)
- Lifecycle `"active"`, required `true` for scheduler/cache functionality
- Present = `"healthy"`, missing = `"missing_required"`

### UPSTOX_NOTIFIER_SECRET: optional
- Used only for Upstox notifier/callback verification
- Missing is `"missing_optional"` — not a blocker

### UPSTOX_REDIRECT_URI: optional
- Needed only for OAuth refresh flow
- If token is set manually, redirect URI is not required for normal operation

## Backend Contract Changes

Data-coverage endpoint now returns structured provider status:

```json
{
  "provider": {
    "FINNHUB_KEY": {
      "lifecycle": "deprecated",
      "required": false,
      "status": "disabled",
      "message": "Removed from active pipeline. Not required."
    },
    "INDIANAPI_KEY": {
      "lifecycle": "active",
      "required": true,
      "status": "healthy",
      "message": "Quotes and metadata active."
    }
  }
}
```

No raw env var names are exposed in user-facing status messages (only in the provider key, which is used programmatically). The frontend `ProviderStatusPill` converts keys to display names.

## Frontend Trust Centre Changes

`ProviderStatusPill` now renders structured status:

| Status | Display | Style |
|---|---|---|
| `healthy` | "Active" | Green |
| `present` | "Configured" | Green |
| `disabled` / `deprecated` | "Deprecated" | Muted |
| `missing_optional` | "Optional" | Muted |
| `missing_required` | "Required" | Amber |

Each provider now shows a description message below the label, explaining the provider's role.

## Migration 021 — Railway Status

Applied successfully to Railway production Postgres on 2026-06-17.

| Column | Type | Status |
|---|---|---|
| `source_label` | TEXT | ✅ Added |
| `source_url` | TEXT | ✅ Added |
| `period_type` | TEXT | ✅ Added |
| `metrics_json` | TEXT | ✅ Added |
| `ingestion_run_id` | TEXT | ✅ Added |
| `ingestion_timestamp` | TEXT | ✅ Added |

Migration was idempotent — all ALTER TABLE statements used `ADD COLUMN IF NOT EXISTS`.

## Fundamentals Importer Readiness

- Template validated: ✅ (2 rows, 18 fields each)
- Import pipeline dry-run: ✅ (clean)
- No real export file available yet — awaiting operator-provided CSV

## Production Verification

| Check | Result |
|---|---|
| `npm run smoke:production` | ✅ 7/7 PASS |
| `npm run verify:data:production` | ✅ 8/8 PASS |
| `npm run test:unit` | ✅ 905/905 (86 files) |
| `npm run test:e2e` | ✅ 36/36 (8.1s) |
| `npm run typecheck:all` | ✅ |
| `npm run build:frontend` | ✅ (1.20s) |
| `npm run build:backend` | ✅ |

## Remaining Blockers

1. **Provider status change needs Railway redeploy** — The structured provider status contract (`healthy`/`missing_optional`/`deprecated` labels) is in the code but requires a Railway deploy to take effect in the production API.
2. **No operator-provided fundamentals export file yet** — The CSV import pipeline awaits a real export file. See `docs/data/fundamentals-import.md`.
3. **Upstox token still expired** — Marked as optional/degraded; not a core app blocker.

## Confirmations

- ✅ No fake data added
- ✅ No fake fundamentals added
- ✅ No secrets printed or committed
- ✅ No scoring/ranking/prediction formula changes
- ✅ No provider algorithm changes beyond status classification
- ✅ No access-control bypass added
- ✅ Migration 021 additive and idempotent — no destructive changes
