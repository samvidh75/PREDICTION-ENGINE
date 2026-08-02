# Phase 18A - AI Inference Foundation

- Baseline commit: `a934bee4b`
- Objective: add a deterministic-first AI explanation foundation that never becomes the official StockStory scoring source.

## Files inspected

- `package.json`
- `src/pages/StockPage.tsx`
- `src/services/marketBrainResearch.ts`
- `src/services/marketBrainResearch.test.ts`
- `src/services/marketBrainResearch.evidenceFallback.test.ts`
- `src/services/marketBrainResearch.malformed.test.ts`
- `src/research/contracts/productContracts.ts`
- `src/systems/market-brain/researchContract.ts`
- `src/systems/market-brain/researchNarrative.ts`
- `src/systems/market-brain/marketBrainGuardrails.ts`

## Existing Market Brain state

- `marketBrainResearch.ts` already exposes a product-safe Market Brain DTO.
- `researchContract.ts` already converts deterministic Market Brain output into public research copy.
- Source-of-truth remains deterministic in Market Brain and related engine code.

## Existing Healthometer and scanner source-of-truth state

- Healthometer scoring logic already exists in deterministic engine code and tests.
- Scanner and watchlist types already exist in `productContracts.ts`.
- No existing `src/components/ai-orchestrator/` module was present.

## Existing local AI and AI chat state

- Repo still contains older local/provider AI references in internal code, docs, and reports.
- No production-ready, investor-facing browser-local AI explainer module existed in the requested location.

## Chosen architecture

- Added `src/components/ai-orchestrator/` with:
  - source-of-truth policy
  - public-safe research AI types
  - safe context extraction
  - guardrails
  - device capability detection
  - deterministic-first orchestrator
  - Healthometer context builder
  - explanation panel

## Source-of-truth policy result

- Added `sourceOfTruthPolicy.ts`.
- Local AI is explicitly limited to explanation only.
- Official Healthometer, scanner, compare, watchlist, and alert outputs remain deterministic.

## Context builder result

- Added `researchAiContext.ts`.
- Accepts safe Market Brain, scanner, compare, watchlist, and alert-like shapes.
- Drops unsafe copy and internal/plumbing wording.
- Bounds compressed context to configured limits.

## Guardrails result

- Added `researchAiGuardrails.ts`.
- Sanitizes questions and output.
- Rejects recommendation language, target language, provider/model/runtime wording, prompt injection text, JSON-like payloads, and internal error copy.

## Capability detection result

- Added `deviceAiCapability.ts`.
- SSR-safe and test-safe.
- Does not initialize or download any model.

## Deterministic orchestrator result

- Added `researchAiOrchestrator.ts`.
- Always builds deterministic explanation first.
- Browser-local preference is progressive only.
- Current browser-local path safely falls back instead of faking inference.

## Healthometer explanation context result

- Added `healthometerAiContext.ts`.
- Reuses provided score and explanation inputs only.
- Does not recalculate score.
- Does not invent reasons when factor details are missing.

## Stock detail integration result

- Added `ResearchAiExplanationPanel.tsx`.
- Integrated two compact explainer panels into `StockPage.tsx` for Healthometer-style and research-thesis context.
- No automatic model startup.
- Immediate standard explanation path remains available.

## Files changed

- `package.json`
- `src/components/ai-orchestrator/*`
- `src/pages/StockPage.tsx`
- `src/pages/__tests__/StockDetailPage.test.tsx`

## Tests added

- `src/components/ai-orchestrator/sourceOfTruthPolicy.test.ts`
- `src/components/ai-orchestrator/researchAiContext.test.ts`
- `src/components/ai-orchestrator/researchAiGuardrails.test.ts`
- `src/components/ai-orchestrator/deviceAiCapability.test.ts`
- `src/components/ai-orchestrator/researchAiOrchestrator.test.ts`
- `src/components/ai-orchestrator/healthometerAiContext.test.ts`
- `src/components/ai-orchestrator/ResearchAiExplanationPanel.test.tsx`
- `src/pages/__tests__/StockDetailPage.test.tsx`

## Public-copy audit result

- The requested grep returns many matches in docs, reports, legacy/internal code, and tests.
- This phase did not add public investor-facing provider/model/runtime wording in the new explanation panel.
- Existing repo-wide legacy references remain and should be handled in a dedicated cleanup pass.

## Verification result

- `git pull --ff-only origin main`: blocked because local `main` is ahead of `origin/main` by 16 commits and cannot fast-forward.
- `git status`: completed.
- `git log --oneline -35`: completed.
- `npm run typecheck:all`: passed.
- `npm run lint`: passed.
- `npm run validate:hygiene`: passed with pre-existing warnings in:
  - `src/services/ai/ExternalLLMProvider.ts`
  - `src/stockstory/intelligence/__tests__/DeepIntegration.test.ts`
- `npm run build:frontend`: passed.
- `npm run build:backend`: passed.
- Targeted tests for this phase: passed (`8` files, `19` tests).
- `npm run test:unit`: failed due pre-existing PMF aggregator test errors in:
  - `src/stockstory/pmf/__tests__/ScannerQualityAnalytics.test.ts`
  - `src/stockstory/pmf/__tests__/RetentionAggregator.test.ts`
  - `src/stockstory/pmf/__tests__/ResearchQualityAggregator.test.ts`

## Blocked commands

- `git pull --ff-only origin main` blocked by diverged local `main`.
- `npm run test:unit` blocked by unrelated pre-existing PMF test failures.

## Confirmations

- Backend untouched or minimal-change confirmation: no backend code paths were modified.
- Local AI not source of truth confirmation: yes.
- No fake data confirmation: yes; explanation layer uses existing page context only.
- No secrets confirmation: yes.
- No broker execution confirmation: yes.
- No direct recommendation language confirmation: yes in new public-facing explainer copy.
- No public backend/provider/model leakage confirmation: yes in new public-facing explainer copy.

## Next remaining task

- Phase 18B should add the actual browser-local worker runtime behind this orchestrator with explicit user start, progressive enhancement, and deterministic fallback preserved by default.

## Phase 18A-R2 reconciliation

- Date: `2026-06-30`
- Stop rule applied: Phase 18B paused and not started because local `main` had diverged from `origin/main`.
- Initial branch state before reconciliation: `main...origin/main [ahead 17, behind 155]`
- Backup branch created: `backup/local-main-before-phase18a-reconcile-20260630-195444`
- Local `main` HEAD before reset: `0c80cf3dd` (`Add deterministic AI explanation foundation`)
- `origin/main` reconciliation base used for reset: `6114e1c4a` (`Fix __dirname ESM error in StockUniverseAdapter`)

## Reconciliation actions

- Saved divergence inventory under `.tmp/reconcile-phase-18a-r2/`:
  - `diverged-commits.txt`
  - `worktree.patch`
  - `staged.patch`
  - `worktree-files.txt`
- Hard-reset local `main` to `origin/main`.
- Cherry-picked only Phase 18A commit `0c80cf3dd`.
- Resolved cherry-pick conflicts surgically:
  - kept current `origin/main` Stock detail page structure
  - re-integrated the explanation panel into `src/pages/StockPage.tsx`
  - preserved deterministic-first guardrails and context builders
  - added compatibility exports in `src/components/ai-orchestrator/` so existing upstream AI-orchestrator surfaces continue to compile
- Final reconciled Phase 18A landing commit on `main`: `ccb3f1e4a` (`Add deterministic AI explanation foundation`)

## Post-reconciliation verification

- `git rev-list --left-right --count origin/main...HEAD`: passed with `0 1`
- `npm run typecheck:all`: passed
- `npm run lint`: passed
- `npm run validate:hygiene`: passed with one pre-existing warning in `src/stockstory/intelligence/__tests__/DeepIntegration.test.ts`
- `npm run build:frontend`: passed
- `npm run build:backend`: passed
- Generated frontend artifacts were cleaned before finalizing, leaving a clean worktree

## Post-reconciliation test status

- `npm test -- ai-orchestrator`: failed in `src/components/ai-orchestrator/ResearchAiChatPanel.test.tsx` with invalid React element errors in older upstream chat-panel coverage
- `npm test -- StockDetail`: failed in `src/pages/__tests__/StockDetailPage.test.tsx` because the rendered page fell back to `StockError` instead of exposing the expected AI explanation copy
- `npm run test:unit`: result not captured conclusively during the reconciliation run after context compaction; latest confirmed targeted failures are the two test commands above

## Reconciliation confirmations

- Phase 18B was not started in this reconciliation pass
- No force-push was used
- Local AI remains explanation-only and not a source of truth
- No public backend/provider/model wording was introduced in the reconciled Stock detail explanation UI

## Phase 18A-R3 Rebase and Targeted Test Fix

- Starting state after R2 fetch drift: local `main` moved from `ahead 1, behind 2` to `ahead 1, behind 4` after `origin/main` advanced again during reconciliation.
- New remote commits found during R3:
  - `488172995` `Trigger Render and Vercel redeploy`
  - `4d529b04c` `Fix Docker Smoke CI healthz/readyz assertions and port mapping`
  - `26a19be90` `Harden research AI context safe copy filtering`
  - `71f556d99` `Test research AI context safe copy filtering`
- Safety backup created before rebase: `backup/phase18a-r3-before-rebase-20260630-201156`
- Rebased Phase 18A onto latest `origin/main`.
- Rebase conflicts were limited to:
  - `src/components/ai-orchestrator/researchAiContext.ts`
  - `src/components/ai-orchestrator/researchAiContext.test.ts`
- Kept the newer upstream safe-copy filtering while preserving the Phase 18A deterministic-first context model and compatibility helpers.
- Fixed targeted `ai-orchestrator` failures by:
  - stabilizing `ResearchAiChatPanel` for test/runtime environments with a guarded `scrollIntoView`
  - aligning `ResearchAiChatPanel.test.tsx` with the current component contract
  - keeping alert/body fallback wiring intact in `researchAiContext.ts`
- Fixed targeted `StockDetail` failure by updating `src/pages/__tests__/StockDetailPage.test.tsx` to use a current stock-page payload fixture and mock unrelated browser-only widgets.
- Fixed the follow-on full-suite regression in `src/components/alerts/researchAlertViewModel.ts` so watchlist research alerts preserve safe alert body copy and category mapping.
- Phase 18B was not started.
- No force-push was used.
- No generated build output was committed.

## Phase 18A-R3 final state

- Final local commit hash before push: `b4fea3f29`
- Branch state before final commit step: `main...origin/main [ahead 1]`

## Phase 18A-R3 verification

- `npm run typecheck:all`: passed
- `npm run lint`: passed
- `npm run validate:hygiene`: passed with one pre-existing warning in `src/stockstory/intelligence/__tests__/DeepIntegration.test.ts`
- `npm run build:frontend`: passed
- `npm run build:backend`: passed
- `npm test -- ai-orchestrator -- --runInBand`: passed
- `npm test -- StockDetail -- --runInBand`: passed
- `npm test -- WatchlistPage -- --runInBand`: passed
- `npm run test:unit`: passed (`209` files, `2044` tests passed, `7` skipped)

## Phase 18A-R3 confirmations

- Backend untouched confirmation: yes; no backend logic was changed in this pass
- Local AI not official scoring source confirmation: yes
- No fake data confirmation: yes outside test fixtures
- No secrets confirmation: yes
- No broker execution confirmation: yes
- No recommendation language confirmation: yes in the reconciled public-facing explanation copy
- No public backend/provider/model leakage confirmation: yes in the reconciled public-facing explanation and alert copy

## Phase 18A-R4 Final Moving-Remote Rebase

- Starting state after R3: local `ahead 2, behind 2`.
- New remote commits found:
  - `a146e927c` `Fix research AI context test call`
  - `56ac32dfa` `Document research AI context safe copy hardening`
- Backup branch created before rebase: `backup/phase18a-r4-before-final-rebase-20260630-202707`
- Rebased local Phase 18A commits onto latest `origin/main`.
- Preserved upstream safe-copy hardening.
- Preserved Phase 18A deterministic explanation foundation.
- Phase 18B was not started.
- No force-push used.
- No generated build output committed.

## Phase 18A-R4 final commits

- `4b3fae975` `Add deterministic AI explanation foundation`
- `0a0557932` `Stabilize Phase 18A AI explanation tests`

## Phase 18A-R4 verification

- `npm run typecheck:all`: passed
- `npm run lint`: passed
- `npm run validate:hygiene`: passed with one pre-existing warning in `src/stockstory/intelligence/__tests__/DeepIntegration.test.ts`
- `npm run build:frontend`: passed
- `npm run build:backend`: passed
- `npm test -- ai-orchestrator -- --runInBand`: passed
- `npm test -- StockDetail -- --runInBand`: passed
- `npm run test:unit`: passed (`209` files, `2044` tests passed, `7` skipped)
- Generated artifact cleanup result: no tracked `dist/public` changes remained after verification

## Phase 18A-R4 confirmations

- Backend untouched confirmation: yes
- Local AI not official scoring source confirmation: yes
- Official scores remain deterministic confirmation: yes
- No fake data confirmation: yes outside test fixtures
- No secrets confirmation: yes
- No broker execution confirmation: yes
- No recommendation language confirmation: yes in public-facing explanation and alert copy
- No public backend/provider/model leakage confirmation: yes
