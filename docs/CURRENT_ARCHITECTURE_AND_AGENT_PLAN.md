# Current Architecture And Agent Plan

## Current Shape

This repository is now consolidated onto `main`. The production system should be treated as four cooperating layers:

1. Frontend: Vite/React app deployed on Vercel from `dist`.
2. Backend API: Fastify service deployed on Render from `dist/backend/backend/startServer.js`.
3. Data/provider plane: `ProviderCoordinator`, provider broker, authorized providers, and normalization/quality gates.
4. Operations plane: health/readiness routes, validations, repair scripts, CI gates, and the new `agent:doctor` command.

## Request Flow

User URL or app action:

1. Vercel serves the React app.
2. `/api/*`, `/healthz`, and `/readyz` are rewritten to the Render API.
3. Fastify routes call domain services.
4. Domain services use the database first when the answer is already materialized.
5. Provider-backed services call `ProviderCoordinator`.
6. `ProviderCoordinator` calls providers through broker/circuit-breaker/quality-gate controls.
7. Responses include only source-backed data or explicit unavailable/partial states.

## Provider Policy

Financial fundamentals should flow through this precedence:

1. Upstox fundamentals when an access token is configured.
2. Screener.in only when authorized provider config enables it.
3. Moneycontrol only when authorized provider config enables it.
4. Finnhub when `FINNHUB_KEY` or `FINNHUB_API_KEY` is present.
5. Yahoo only for price/volume/history and derived fields that are actually available.

Rules:

- Fetch one bundle per provider per symbol.
- Do not fabricate unavailable fields.
- Keep field-level lineage in `_sources`.
- Keep provider errors sanitized in `_providerErrors`.
- Stop fallback calls once scoring fields are complete.
- Reject schema drift instead of silently parsing garbage.

## Self-Healing Agent

The repo-native operational agent is `npm run agent:doctor`.

It runs:

- lint
- full typecheck
- provider broker tests
- unit tests
- schema validation
- query-schema validation
- data-integrity validation
- hygiene validation

It writes a machine-readable report to:

`reports/agent/doctor-latest.json`

Repair mode is intentionally gated:

`npm run agent:doctor:apply`

Apply mode sets the explicit confirmation variables and delegates actual database/table/index repair work to `scripts/auto-repair.ts`.

## Deployment Contract

Vercel:

- Build command: `npm run build:vercel`
- Output directory: `dist`
- Rewrites:
  - `/api/*` to Render
  - `/healthz` to Render
  - `/readyz` to Render
  - all other routes to `/index.html`

Render:

- Runtime: Node 22.12.0
- Build command: `npm ci && npm run compile:backend && npm run build`
- Start command: `npm start`
- Health check: `/readyz`
- Required production env:
  - `DATABASE_URL`
  - `COOKIE_SECRET`
  - `DB_ADAPTER=postgres`
  - `ALLOW_SQLITE_FALLBACK=false`
  - `ALLOW_SQLITE_IN_PRODUCTION=false`
  - provider keys as available

## Stabilization Priorities

1. Keep `main` green with `agent:doctor`.
2. Make provider health visible through `/api/ops/health` and CI artifacts.
3. Materialize provider ingestion into database snapshots before user requests when possible.
4. Let live requests fall back through providers only for freshness gaps.
5. Keep all user-facing outputs source-backed, partial, or unavailable. No synthetic finance or invented exchange defaults.
