# Phase 2 — Data Ingestion Adapter Foundation

**Status:** Implemented minimal safe foundation
**Branch:** `main`
**Scope:** Types, normalization helpers, null adapters, registry, evidence pack builder, and unit tests

## Phase 1 closure

Phase 1 artifacts were present before this run, including `reports/market-brain/phase-1-market-brain-research-engine.md`. That report marks Phase 1 complete, including Market Brain guardrails, evidence normalization, research contract safety, frontend normalization, and the deterministic anomaly evidence pack.

No Phase 1 code changes were required in this run.

## What changed

### Canonical data contracts

Added `src/services/data/dataAdapterTypes.ts` with canonical internal contracts for:

- company master records
- price candles
- financial snapshots
- news and event records
- filings
- ownership
- corporate actions
- derivatives
- sector and macro context
- adapter result success/failure shapes
- adapter interfaces for each domain

### Normalization helpers

Added `src/services/data/normalizeDataRecord.ts` with helpers for:

- symbol normalization
- string normalization
- finite number parsing
- ISO timestamp normalization
- safe HTTPS URL normalization
- stable-key dedupe
- price candle normalization

### Null adapters

Added `src/services/data/nullAdapters.ts` with explicit unavailable adapters for every domain.

These adapters do not create placeholder facts. They return typed unavailable results with canonical timestamps and internal error codes.

### Adapter registry

Added `src/services/data/dataAdapterRegistry.ts`.

The registry defaults to null adapters and supports safe injection of real adapters later.

### Evidence pack builder

Added `src/services/data/evidencePackBuilder.ts`.

It converts adapter outputs into a compact internal `MarketEvidencePack` using the same domains as the Market Brain evidence review model:

- `financial_statements`
- `price_volume`
- `news_events`
- `ownership`
- `derivatives`
- `sector_context`
- `corporate_actions`

It does not emit raw adapter errors into evidence items.

## Tests added

Added:

- `src/services/data/normalizeDataRecord.test.ts`
- `src/services/data/nullAdapters.test.ts`
- `src/services/data/evidencePackBuilder.test.ts`

Coverage includes:

- symbol normalization
- malformed symbol rejection
- string and number normalization
- timestamp normalization
- URL safety
- candle normalization
- null adapter failure shape
- registry injection
- evidence pack domain mapping
- defensive fresh arrays

## Safety confirmations

- No fake data added.
- No fake rankings added.
- No fake predictions added.
- No broker execution added.
- No secrets touched.
- No environment variables added.
- No public recommendation language added.
- No frontend UX changes made.
- Adapter errors remain internal-only.

## Verification status

Could not run local npm commands from the GitHub connector in this automation context.

Commands that still need local/CI verification:

```bash
npm run typecheck:all
npm run lint
npm run test:unit
npm run validate:hygiene
npm run build:frontend
npm run build:backend
```

## Next remaining task

Phase 3 should wire the first real existing data source into these contracts, starting with company master and daily price candles. Keep all other domains on null adapters until each has a verified implementation.
