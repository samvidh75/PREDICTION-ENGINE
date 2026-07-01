# Phase 23A: Render Deployment Parity Fix

## Problem

The Render deployment for Equity Lens was failing because:

1. **render.yaml `buildCommand` used `NODE_ENV=development`** — Set NODE_ENV=development to ensure npm ci installs devDependencies (needed for tsc/vite), but this is a messy pattern that can leak dev behaviour into the build step.

2. **Hardcoded production API base URL** — `src/config/domain.ts` hardcoded `https://stockstory-india.com/api` as the production API base URL, but the SPA and API are served from the *same* Render instance. API calls should use same-origin `/api` regardless of environment.

3. **No deploy-time commit/built-time visibility** — The `/version` endpoint lacked commit SHA, build timestamp, and uptime. Startup logs didn't show what commit was deployed, making it impossible to confirm the live server matched the repo HEAD.

4. **No `.node-version` file** — Render may default to a different Node version than `engines.node` in package.json.

5. **No post-deploy smoke test** — No script to verify the live deploy is running the expected commit.

## Changes

### render.yaml
- `buildCommand`: `NODE_ENV=development npm ci && npm run build:docker` → `npm ci --include=dev && npm run render:build`
- `startCommand`: `npm start` → `npm run render:start`

### package.json
- Added `render:build`: compiles backend + builds frontend (same as build:docker)
- Added `render:start`: explicit alias for `node dist/render/startServer.js`

### .node-version
- New file with `22.12.0` to lock Render's Node version

### src/render/startServer.ts
- Added `COMMIT_SHA`, `BUILD_ISO` captured at import time from `.git/HEAD`
- `/version` endpoint now includes: `commitSha`, `commitShaShort`, `buildTime`, `uptimeSeconds`
- New `/api/health` endpoint (same as `/healthz` but under `/api` namespace)
- New `/api/version` endpoint (same as `/version` but under `/api` namespace)
- Startup log now prints: `Deployed commit: abc12345 | Build time: ... | Node: v22.12.0`

### src/config/domain.ts
- Production API base URL changed from `https://stockstory-india.com/api` → `/api` (same-origin)

### scripts/deployment/render-smoke-check.mjs
- New script that smoke-tests all health/version endpoints
- Accepts optional expected commit SHA for verification
- Checks: healthz, readyz, version, /api/health, /api/version, metrics, SPA index.html

### docs/operations/render-env-checklist.md
- New doc: required env vars, optional flags, sync fields, verification steps

## Verification

1. Typecheck passes: `npm run typecheck:active`
2. Lint passes: `npm run lint:active`
3. Build succeeds: `npm run render:build`
4. Post-deploy: `node scripts/deployment/render-smoke-check.mjs https://stockstory-api.onrender.com <expected-commit>`

## Remaining Risks

- **Custom domain DNS (stockstory-india.com)**: If it doesn't point to Render, users accessing via custom domain will get a different backend. This is acceptable for now as the app works on the Render default URL.
- **Firebase / env parity**: Setting all `sync: false` vars manually in Render Dashboard is still required.
