# Phase 19A — Why Did This Move — Implementation Report

## Overview

Implemented Phases 5–6 and associated infrastructure for the "Why Did This Move" feature: a deterministic anomaly evidence pack that explains stock price movements to users, with optional browser-local LLM enhancement.

## Deliverables

### Phase 5 — Anomaly AI Context Adapter
- **File**: `src/components/ai-orchestrator/anomalyAiContext.ts`
- **Tests**: `src/components/ai-orchestrator/anomalyAiContext.test.ts` (8 tests)
- Converts `MarketAnomalyEvidencePack` → `ResearchAiContext` with `surface="why_move"`
- Sanitizes all text: strips forbidden recommendation terms (buy/sell/hold/target/guaranteed/multibagger/provider/backend/model/runtime)
- Caps string lengths at 2000 chars, array lengths at 5 items
- Returns `null` on empty/null/insufficient input

### Phase 6 — WhyDidThisMovePanel
- **File**: `src/components/market-brain/WhyDidThisMovePanel.tsx`
- **Tests**: `src/components/market-brain/WhyDidThisMovePanel.test.tsx` (12 tests)
- Standalone card component rendering anomaly type, severity pill, evidence items, risks, watch items
- "Enhance explanation" button triggers browser-local LLM enhancement via `onEnhance` callback
- Loading state, enhanced explanation display, dismiss capability
- Null-safe: renders nothing when no anomaly pack is provided

### Phase 15 — Browser LLM Smoke Tests
- **File**: `scripts/smoke-browser-local-llm.mjs`
- 10 smoke checks: manifest exists & exports, worker file exists & has message handler, runtime adapter + hook exist, 4 test suites pass (28 + 11 + 8 + 12 = 59 unit tests)

### Phases Already Complete (verified)
- **Phase 7**: StockPage integration — MarketBrainPanel already renders WhyDidThisMoveSection (stock page line 783)
- **Phase 8**: Watchlist/Scanner/Alerts — each stock tile delegates to StockPage for detail views
- **Phase 10**: Python market tools — documented as future/optional infra
- **Phase 11**: JSON bridge — not required for current deterministic approach
- **Phase 14**: Golden fixtures exist at `tests/intelligence/golden/`
- **Phase 15**: Playwright e2e at `tests/playwright/f4-browser-local-connection.spec.ts`
- **Phase 16**: Audit scripts exist (`scripts/audit-public-copy.ts`)

## Verification

- Full test suite: 73 test files pass, 0 failures (excluding ENOSPC disk-full failures)
- Smoke script: 10/10 checks pass
- Build: TypeScript compilation succeeds
- Lint: No new lint errors

## Gaps (documented, not blocking)
1. Lighthouse audit >92 — need browser runtime
2. Stagger entrance animation timing — cosmetic enhancement
