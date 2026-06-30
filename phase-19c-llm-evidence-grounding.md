# Phase 19C — LLM Evidence Grounding

## Overview

Wire real event evidence (news, earnings, alerts) into the browser-local LLM
context so explanations reference grounded data instead of generic text.

## Deliverables

### Event evidence contracts (`src/research/contracts/eventEvidenceContracts.ts`)
- `EventEvidenceItem`, `EventEvidencePack`, `EventEvidenceKind`, `EventEvidenceImpact` types

### Event evidence pack builder (`src/systems/market-brain/eventEvidencePack.ts`)
- `buildEventEvidencePack()` — full deterministic data → event evidence
- `compressEventEvidencePack()` — truncation for LLM context window

### Research AI quality gate (`src/components/ai-orchestrator/researchAiQualityGate.ts`)
- `evaluateAnswerQuality()` — shared gate: forbidden terms, invented percentages,
  context grounding threshold, recommendation/broker language, internal errors
- Used by both runtime (`queryBrowserLocalRuntime`) and acceptance harness

### Event evidence → LLM context adapter (`src/components/ai-orchestrator/eventEvidenceAiContext.ts`)
- `enrichResearchContextWithEvents()` — merges event evidence into existing context
- `buildEventContext()` — standalone event-only context
- `buildNewsEventPack()` — news headline array → lightweight event pack
- Forbidden term sanitization via `sanitizeLabel()`

### Surface integrations
- **StockPage** — enriches both research and healthometer contexts with news events
- **WatchlistPage** — delegates to shared `buildWatchlistAiExplanationContext`
- **WatchlistAiExplanationContext** — `buildAlertEventPack()` converts alerts to events

### Shared UI affordance (`src/components/EnhancedExplanationAction.tsx`)
- Popover button showing enriched context with event evidence summary

### Gated quality gate smoke test (`src/components/ai-orchestrator/gatedQualityGateSmoke.test.ts`)
- 9 tests: forbidden terms, grounding, invented percentages, recommendations, etc.

### Sanitization
- `eventToText()` sanitizes item labels via `sanitizeLabel()` (global `gi` flag)
- `buildNewsEventPack()` sanitizes news headlines
- WatchlistPage uses shared orchestrator version (already sanitized)

## Files created or modified

| File | Action |
|------|--------|
| `src/research/contracts/eventEvidenceContracts.ts` | Created |
| `src/systems/market-brain/eventEvidencePack.ts` | Created |
| `src/components/ai-orchestrator/researchAiQualityGate.ts` | Created |
| `src/components/ai-orchestrator/eventEvidenceAiContext.ts` | Created |
| `src/components/ai-orchestrator/eventEvidenceAiContext.test.ts` | Created |
| `src/components/ai-orchestrator/gatedQualityGateSmoke.test.ts` | Created |
| `src/components/EnhancedExplanationAction.tsx` | Created |
| `src/components/ai-orchestrator/researchAiContext.ts` | Modified |
| `src/components/ai-orchestrator/watchlistAiExplanationContext.ts` | Modified |
| `src/components/ai-orchestrator/index.ts` | Modified |
| `src/components/ResearchAiSurfaceTrigger.tsx` | Modified |
| `src/pages/StockPage.tsx` | Modified |
| `src/pages/WatchlistPage.tsx` | Modified |

## Test results

- 2330 tests passing, 2 pre-existing failures (model not available in CI)
- 19 event evidence context tests pass
- 4 watchlist AI explanation tests pass
- 9 gated quality gate smoke tests pass

## Key design decisions

1. **Forbidden terms must be redacted in event labels too** — `sanitizeLabel()` applies
   `/\b(provider|backend|api|...)\b/gi` to event text before it reaches LLM context.
2. **Enrichment must not overwrite existing `whatChanged`** — prefers base context
   data when already populated.
3. **Quality gate is a pure function** — no model calls, used by both acceptance
   harness and runtime path.
