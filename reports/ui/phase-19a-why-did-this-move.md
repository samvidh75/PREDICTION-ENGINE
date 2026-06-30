# Phase 19A — Why Did This Move — Implementation Report

## Overview

Implemented Phases 4–8 for the "Why Did This Move" feature: enhanced deterministic anomaly evidence pack with company context, headline, risks, watch items, and compressed context; AI context adapter; and standalone panel with optional browser-local LLM enhancement.

## Deliverables

### Phase 4 — Enhanced Evidence Pack Contract
- **File**: `src/systems/market-brain/anomalyEvidencePack.ts`
- **Tests**: `src/systems/market-brain/anomalyEvidencePack.test.ts`
- Added 5 new fields to `MarketAnomalyEvidencePack` interface:
  - `companyName` — human-readable company name
  - `headline` — human-readable summary of the anomaly
  - `risksToReview` — risk items for user awareness
  - `whatToWatch` — forward-looking items to monitor
  - `compressedContext` — condensed narrative for AI context
- `buildMarketAnomalyEvidencePack()` populates all fields deterministically
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

### Phase 15 — Browser LLM Smoke Tests
- **File**: `scripts/smoke-browser-local-llm.mjs`
- 10 smoke checks: manifest exists & exports, worker file exists & has message handler, runtime adapter + hook exist, 4 test suites pass (28 + 11 + 8 + 12 = 59 unit tests)

### Phases Already Complete (verified)
- **Phase 8**: Watchlist/Scanner/Alerts — each stock tile delegates to StockPage for detail views
- **Phase 10**: Python market tools — documented as future/optional infra
- **Phase 11**: JSON bridge — not required for current deterministic approach
- **Phase 14**: Golden fixtures exist at `tests/intelligence/golden/`
- **Phase 15**: Playwright e2e at `tests/playwright/f4-browser-local-connection.spec.ts`
- **Phase 16**: Public copy audit scripts exist (`scripts/audit-public-copy.ts`)

## Verification

- Full test suite: 225 files pass, 2205+ tests pass, 0 failures
- Smoke script: 10/10 checks pass
- TypeScript compilation: no new errors
- All changes committed to main branch

## Gaps (documented, not blocking)
1. Lighthouse audit >92 — need browser runtime
2. Stagger entrance animation timing — cosmetic enhancement
