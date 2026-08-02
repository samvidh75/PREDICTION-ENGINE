# Final Deployment Command Sheet

**Date:** 2026-06-15
**Final Main SHA:** `1dcb05bd0db46d6dd93f3f29c10ce1f6c3b255e6`
**Deployment Source SHA:** `1dcb05bd0db46d6dd93f3f29c10ce1f6c3b255e6`

---

## PR #28 Merge Confirmation

| Field | Value |
|---|---|
| PR | #28 |
| Title | Add deployment execution record |
| Status | Merged with squash |
| Diff scope | Report-only: `reports/deployment-readiness/03-deployment-execution-record.md` |
| Main after merge | `1dcb05bd0db46d6dd93f3f29c10ce1f6c3b255e6` |

---

## Final Deployment Gate Results

| Gate | Result |
|---|---|
| `npm run typecheck:all` | PASS |
| `npm run validate:hygiene` | PASS |
| `npm run build:frontend` | PASS |
| `npm run build:backend` | PASS |

---

## Open PR Count

**0** open PRs after PR #28 merge.

---

## Required Runtime

- Node.js: `>=22.12.0 <23` from `package.json` engines.
- Install assumption: run `npm ci` from a clean checkout.
- Frontend build assumption: Vite writes production assets to `dist`.
- Backend build assumption: TypeScript emits backend files to `dist/backend`, then `scripts/fix-esm-imports.js` repairs ESM import paths.

---

## Environment Variable Checklist

### Database

- [ ] `DB_ADAPTER=postgres` for production.
- [ ] `DATABASE_URL` configured outside the repo.
- [ ] `ALLOW_SQLITE_FALLBACK=false` in production.
- [ ] `ALLOW_SQLITE_IN_PRODUCTION=false` in production.

### Redis / Provider Broker / Rate Limit

- [ ] `REDIS_URL` configured when Redis-backed coordination is required.
- [ ] `PROVIDER_BROKER_REDIS_REQUIRED` matches deployment topology.
- [ ] `PROVIDER_BROKER_SINGLE_INSTANCE_ALLOWED` matches deployment topology.
- [ ] `RATE_LIMIT_REDIS_REQUIRED` matches deployment topology.
- [ ] `RATE_LIMIT_SINGLE_INSTANCE_ALLOWED` matches deployment topology.

### Provider Credentials

- [ ] `FINNHUB_KEY` or `FINNHUB_API_KEY` configured where Finnhub is required.
- [ ] `INDIANAPI_KEY` configured where IndianAPI is required.
- [ ] `UPSTOX_ACCESS_TOKEN` configured only when Upstox ingestion is enabled.
- [ ] Screener/Moneycontrol authorization env is configured only when authorized ingestion is enabled.
- [ ] Missing required credentials fail closed before outbound calls.

### Auth / Cookies / Frontend URLs

- [ ] `COOKIE_SECRET` configured outside the repo.
- [ ] `EXTRA_ALLOWED_ORIGINS` includes the deployed frontend URL if it differs from the canonical production origin.
- [ ] Firebase Admin variables are configured if authenticated user routes are enabled:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS`
- [ ] Frontend API rewrites point to the Render backend URL.

---

## Command Placeholders

```sh
# Install
npm ci

# Frontend build
npm run build:frontend

# Backend build
npm run build:backend

# Database migration
npm run migrate

# Backend start
npm start

# Smoke API
API_BASE_URL=<deployment-url> npm run smoke:api
```

---

## Endpoint Checks

```sh
# Liveness
curl -f <deployment-url>/healthz

# Readiness
curl -f <deployment-url>/readyz

# Core StockStory API smoke route
curl -f <deployment-url>/api/stockstory/RELIANCE

# Market-data route if available
curl -f <deployment-url>/api/market-data/market-action
```

---

## Operator Go / No-Go Criteria

### GO

Proceed only if all of the following pass:

- [ ] `/healthz` returns success.
- [ ] `/readyz` returns success and confirms the intended database adapter.
- [ ] Smoke API passes against the deployed backend.
- [ ] Provider broker logs show no call amplification.
- [ ] Database connectivity and migrations are healthy.
- [ ] Redis-backed provider broker and rate-limit settings match the deployment topology.
- [ ] Provider credentials are present where required.

### NO-GO

Do not proceed, or roll back, if any of the following appear:

- [ ] Any synthetic exchange, fiscal-period, or OHLC data is emitted.
- [ ] Provider call amplification is visible in logs.
- [ ] Required environment variables or secrets are missing.
- [ ] Database migration fails.
- [ ] `/healthz` or `/readyz` fails.
- [ ] Smoke API fails.
- [ ] Production hygiene or schema validation fails.

---

## Rollback Instructions

- Previous SHA placeholder: `<previous-known-good-sha>`
- Rollback command placeholder:

```sh
<rollback-frontend-command previous-sha>
<rollback-backend-command previous-sha>
```

Post-rollback verification:

```sh
curl -f <deployment-url>/healthz
curl -f <deployment-url>/readyz
API_BASE_URL=<deployment-url> npm run smoke:api
```

Rollback is required if health, readiness, smoke, provider broker, data-integrity, or synthetic-data checks fail after deployment.

---

## Final Verdict

**DEPLOYMENT_COMMAND_SHEET_READY**

All final deployment gates pass and the PR dashboard is clean. This command sheet is report-only and does not modify production code.
