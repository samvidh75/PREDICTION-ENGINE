# Phase 19A — Why Did This Move — Implementation Report

## Overview

Implemented Phases 4–8 for the "Why Did This Move" feature: enhanced deterministic anomaly evidence pack with company context, headline, risks, watch items, and compressed context; AI context adapter; and standalone panel with optional browser-local LLM enhancement. Phase 19A-G final stabilization completed.

## Baseline

- **Commit**: `e0bf591b`
- **Remote**: in sync (0 ahead, 0 behind)
- **Backup branch**: `backup/phase19a-g-final-stabilize-20260701-021011`
- **TypeScript type errors**: 15 pre-existing (all in provider/services modules, none in Phase 19A code)
- **Test suite**: 226 test files, 2228 tests passed, 7 skipped

## Deliverables

### Phase 0 — Repo Safety
- Verified clean working tree on `main`, in sync with origin
- Created backup branch
- No force-push, no DNS/deployment config changes, no `.tmp` committed

### Phase 1 — Baseline Verification
- `npm run test:unit`: 226 files, 2228 tests passed ✅
- `npm run lint`: clean ✅
- `npm run build:backend`: clean ✅
- `npm run build:frontend`: 15 pre-existing errors (provider modules), none in our code
- `npm run typecheck:all`: same 15 pre-existing errors only

### Phase 4 — Enhanced Evidence Pack Contract
- **File**: `src/systems/market-brain/anomalyEvidencePack.ts`
- **Tests**: `src/systems/market-brain/anomalyEvidencePack.test.ts` (17 tests)
- Added 5 new fields to `MarketAnomalyEvidencePack` interface:
  - `companyName` — human-readable company name
  - `headline` — human-readable summary of the anomaly
  - `risksToReview` — risk items for user awareness
  - `whatToWatch` — forward-looking items to monitor
  - `compressedContext` — condensed narrative for AI context
- `buildMarketAnomalyEvidencePack()` populates all fields deterministically
- Added `companyName?: string | null` to `MarketAnomalyInput` interface
- No recommendation/investment language; purely descriptive

### Phase 5 — Deterministic Anomaly Classifications (existing)
- Anomaly type classification already exists in the evidence pack: "Stock-specific move", "Sector-wide move", "Index-wide move"
- Event classifier at `src/systems/market-brain/eventClassifier.ts`

### Phase 6 — Anomaly AI Context Adapter
- **File**: `src/components/ai-orchestrator/anomalyAiContext.ts`
- **Tests**: `src/components/ai-orchestrator/anomalyAiContext.test.ts` (11 tests)
- Converts `MarketAnomalyEvidencePack` → `ResearchAiContext` with `surface="why_move"`
- Uses enhanced pack fields directly (`companyName`, `headline`, `risksToReview`, `whatToWatch`, `compressedContext`)
- Sanitizes all text: strips forbidden recommendation terms (buy/sell/hold/target/guaranteed/multibagger/provider/backend/model/runtime)
- Caps string lengths, array lengths
- Returns `null` on empty/null/insufficient input
- Missing evidence appended as risks for discoverability

### Phase 7 — WhyDidThisMovePanel
- **File**: `src/components/market-brain/WhyDidThisMovePanel.tsx`
- **Tests**: `src/components/market-brain/WhyDidThisMovePanel.test.tsx` (12 tests)
- Standalone card component rendering anomaly type, severity pill, evidence items, risks, watch items
- Uses adapter's `companyName`, `headline`, `risksToReview`, `whatToWatch` from enhanced context
- "Enhance explanation" button triggers browser-local LLM enhancement via `onEnhance` callback
- Loading state, enhanced explanation display, dismiss capability
- Null-safe: renders nothing when no anomaly pack is provided

### Phase 8 — Stock Detail Integration (existing)
- `WhyDidThisMoveSection` already rendered in `MarketBrainPanel` on stock detail pages
- StockPage consumes `whyDidThisMove` from the view model

### Phase 10 — Python Market Tools Decision
- **Decision**: Skipped. TypeScript analytics (QualityEngine, StabilityEngine, ValuationEngine, anomaly detection) already cover Phase 19A needs. No genuine gap that requires Python.
- Python ecosystem (pandas/numpy/scipy) would duplicate existing TypeScript scoring logic
- No network calls, scraping, or microservice needed
- Frontend must not depend on Python runtime

### Phase 11 — Engine Activation Audit
- **ROA**: ✅ Present in QualityEngine with percentile + fallback scoring (weight: 2.0)
- **Market cap**: ✅ Log10 scoring in StabilityEngine, bounded influence (~7 points max)
- **Dividend yield**: ⚠️ Declared in types but not actively scored — pre-existing feature gap, not a regression
- **Null safety**: ✅ `isFiniteNumber()` used consistently across all engines

### Phase 12 — Public Copy Audit
- Scanned `src/components`, `src/pages`, `src/ui`, `src/app`, `src/systems` for all forbidden terms
- All matches are in guardrails/sanitization patterns, test files (testing sanitization), or internal runtime code
- **No user-facing leaks** of backend/provider/model/runtime or recommendation language

### Phase 15 — Browser LLM Smoke Tests
- **File**: `scripts/smoke-browser-local-llm.mjs`
- 10 smoke checks: manifest exists & exports, worker file exists & has message handler, runtime adapter + hook exist, 4 test suites pass (28 + 11 + 8 + 12 = 59 unit tests)

### Phases Already Complete (verified)
- **Phase 8**: Watchlist/Scanner/Alerts — each stock tile delegates to StockPage for detail views
- **Phase 14**: Golden fixtures exist at `tests/intelligence/golden/`
- **Phase 15**: Playwright e2e at `tests/playwright/f4-browser-local-connection.spec.ts`
- **Phase 16**: Public copy audit scripts exist (`scripts/audit-public-copy.ts`)

## Verification

- Full test suite: 226 files pass, 2228 tests pass, 7 skipped, 0 failures
- Smoke script: 10/10 checks pass
- TypeScript compilation: 15 pre-existing errors (all in provider modules), none in Phase 19A code
- Backend build: clean
- Lint: clean

## Architecture Confirmations

- ✅ Deterministic engines (QualityEngine, StabilityEngine, anomalyEvidencePack) are the source of truth for scores, ranks, severity, and evidence
- ✅ Browser-local LLM explains compressed evidence only — never calculates scores, rankings, or recommendations
- ✅ No Buy/Sell/Hold/target/sure shot/guaranteed/multibagger in user-facing copy
- ✅ No broker execution code
- ✅ No fake data
- ✅ No public backend/provider/model/runtime plumbing
- ✅ No model auto-load on route visit
- ✅ Enhanced explanation starts only after explicit user click
- ✅ `isFiniteNumber()` guards against null/NaN/Infinity everywhere

## Gaps (documented, not blocking)
1. Lighthouse audit >92 — need browser runtime
2. Stagger entrance animation timing — cosmetic enhancement
3. Dividend yield scoring — not implemented in StabilityEngine, declared in types only
