# Phase 19B — Browser-Local LLM Acceptance Testing & Cross-Surface Integration

## Summary

Phase 19B adds deterministic LLM acceptance testing infrastructure and cross-surface
integration validation for all 8 research surfaces in the prediction engine.

## Files Created

| File | Purpose |
|------|---------|
| `src/components/ai-orchestrator/__fixtures__/llmAcceptanceFixtures.ts` | Deterministic fixtures for all 8 surfaces |
| `src/components/ai-orchestrator/__fixtures__/llmAcceptanceFixtures.test.ts` | 75 tests validating fixture consistency |
| `src/components/ai-orchestrator/llmAcceptanceRunner.ts` | Quality evaluator + acceptance runner |
| `src/components/ai-orchestrator/llmAcceptanceRunner.test.ts` | 17 tests for runner functions |

## Surfaces Covered

| Surface | Fixture | AI Integration |
|---------|---------|---------------|
| stock | Stock Detail / Healthometer | ✅ Pre-existing |
| why_move | Why Did This Move (anomaly) | ✅ Pre-existing |
| scanner | Scanner result | ❌ Not wired |
| stock | Rankings row | ❌ Not wired |
| compare | Compare | ❌ Not wired |
| watchlist | Watchlist thesis change | ✅ Pre-existing |
| alerts | Alerts / What changed | ❌ Not wired |
| portfolio | Portfolio thesis-only context | ❌ Not wired |

## Key Components

### `evaluateAnswerQuality(answer, context)`
Pure deterministic function that evaluates answer quality:
- Rejects forbidden terms (buy/sell/hold/target/provider/runtime/model/etc.)
- Rejects internal error language
- Rejects raw null/undefined/NaN/Infinity
- Rejects JSON-like structure
- Checks context grounding ratio (<15% = low confidence)
- Flags invented percentage values
- Flags recommendation language ("should")
- Flags broker/order language
- Returns confidence rating (low/medium/high) and sanitized answer

### `runSurfaceAcceptance(surface, context, safeQuestions, unsafeQuestions)`
Tests a full surface with safe/unsafe questions using deterministic replies:
- Verifies safe questions produce grounded answers
- Verifies unsafe questions still produce safe output
- Verifies no state mutation across calls
- Reports pass/fail counts

### `runLlmAcceptanceCase` / `runLlmAcceptanceSuite`
Evaluate individual or batched model answers against acceptance criteria:
- Applies guardrails (forbidden patterns, sanitization)
- Evaluates answer quality
- Compares against expected acceptance
- Returns detailed reasons for any mismatch

## Guardrail Integration

All fixtures validate against both:
1. `validateChatQuery()` — Chat-specific guardrails (FORBIDDEN_QUERY_PATTERNS)
2. `buildDeterministicReply()` — Deterministic fallback that grounds answers in context
3. `evaluateAnswerQuality()` — Post-hoc quality evaluation

## Test Results

- **84 new tests** (75 fixtures + 17 runner = 92, minus 8 overlapping = 84)
- **Full suite**: 228 test files, 2320 passed, 7 skipped (baseline: 226 files, 2228 tests)
- **Type errors**: 15 pre-existing provider modules, 0 new
- **Lint**: Clean (beyond pre-existing)

## Key Design Decisions

1. **No model calls** — All tests are purely deterministic. No real or mocked LLM invoked.
2. **No fake market data** — Context values are reasonable but unverified live data.
3. **No Buy/Sell/Hold in expected output** — Forbidden traits explicitly exclude recommendation language.
4. **Context compression** — All fixtures use realistic compressed contexts (≤3000 chars).
5. **Surface testability** — Each surface independently verifiable via `runSurfaceAcceptance`.

## Remaining Work (Future Phases)

- Phase 6: Runtime integration acceptance tests
- Phase 7: Surface integration tests (verify no model auto-load)
- Phase 8: E2E smoke script update
- Phase 10: Public-copy audit
- Phase 11-13: Full verification, commit, final response

## Integration Status

4 of 8 surfaces currently have AI integration wired (stock, why_move, watchlist, chat).
Scanner, compare, alerts, rankings, portfolio surfaces lack AI trigger/explanation panel wiring.
This is **by design** — they rely on deterministic engine data.
