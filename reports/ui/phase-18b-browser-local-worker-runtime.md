# Phase 18B — Browser-Local Web Worker AI Runtime

## Status
- **Phase:** 14 (Complete) — Finalized on `main`
- **Branch:** main

## Motivation
Add an optional browser-local AI inference path to the existing Research AI system, allowing users to run a small local language model directly in their browser via a Web Worker (powered by @mlc-ai/web-llm). The deterministic Path 0 always remains first; this is a progressive enhancement for users who want AI-generated explanations without a backend.

## Architecture
```
User Action
    │
    ▼
ResearchAiOrchestrator
    │
    ├── Path 0: Deterministic (always runs first)
    │       └── Returns SectorAnalysisResponse
    │
    └── Path 1: Browser-local Web Worker (optional)
            └── Web Worker (browserLocalResearchWorker.ts)
                    └── @mlc-ai/web-llm (loaded in worker, not main thread)

Runtime types: browserLocalWorkerTypes.ts (shared contract)
```

## Key Constraints
1. Never import the model on page render — user must trigger via button
2. No model/provider/brand names in the public UI — show "AI Explanation" only
3. Deterministic path always stays first — Web Worker is additive
4. Backend untouched — 100% frontend-side
5. If @mlc-ai/web-llm can't be installed (ESM/bundling issues), implement as "safe-unavailable" with a clean message

## File Plan
| File | Purpose |
|------|---------|
| `src/components/ai-orchestrator/browserLocalWorkerTypes.ts` | Worker message contract |
| `src/components/ai-orchestrator/browserLocalResearchWorker.ts` | Web Worker impl |
| `src/components/ai-orchestrator/browserLocalRuntime.ts` | Runtime adapter |
| `src/components/ai-orchestrator/useBrowserLocalResearchRuntime.ts` | React hook |
| Update: `researchAiTypes.ts` | Add BrowserLocalRuntime type |
| Update: `researchAiOrchestrator.ts` | Integrate Web Worker runtime |
| Update: `ResearchAiChatPanel.tsx` | Add explanation trigger |

## Phases
| Phase | Status | Description |
|-------|--------|-------------|
| 0 | ✅ Complete | Baseline checks (typecheck, build, test) |
| 1 | ✅ Complete | Create this report |
| 2 | ✅ Complete | Install @mlc-ai/web-llm |
| 3 | ✅ Complete | Create browserLocalWorkerTypes.ts + 7 tests |
| 4 | ✅ Complete | Build Web Worker |
| 5 | ✅ Complete | Build runtime adapter |
| 6 | ✅ Complete | Integrate orchestrator |
| 7 | ✅ Complete | Build React hook (useBrowserLocalResearchRuntime.ts) |
| 8 | ✅ Complete | Build explanation panel UI |
| 9 | ✅ Complete | Wire into StockDetail page |
| 10 | ✅ Complete | Tests |
| 11 | ✅ Complete | Safety/naming audit |
| 12 | ✅ Complete | Final baseline verification |
| 13 | ✅ Complete | Update report |
| 14 | ✅ Complete | Commit and push |

## Baseline (Phase 0)
- Typecheck: ✅
- Build frontend: ✅
- Build backend: ✅
- AI orchestrator tests: 65 passed
- StockDetail tests: 1 passed
- Full unit tests: 2044 passed, 7 skipped
- Hygiene: ✅

## Final implementation notes
- Browser-local runtime now uses a tighter worker contract:
  - `init`
  - `ask`
  - `reset`
  - `status`
  - `answer`
  - `safe-failure`
- `@mlc-ai/web-llm` is dynamically imported inside the worker only after explicit user start.
- No model loads on page render.
- Stock Detail keeps deterministic explanation as the default visible answer.
- Enhanced explanation starts only after explicit user action on Stock Detail surfaces.
- Non-Stock Detail surfaces keep the simpler deterministic-first panel behavior and were not widened further in this pass.
- Worker requests use compressed safe context plus sanitized question only.
- Worker output is sanitized before it reaches the UI.
- Public UI copy avoids backend/provider/model/runtime naming.

## Final verification
- `npm run typecheck:all`: passed
- `npm run lint`: passed
- `npm run validate:hygiene`: passed with one pre-existing warning in `src/stockstory/intelligence/__tests__/DeepIntegration.test.ts`
- `npm run build:frontend`: passed
- `npm run build:backend`: passed
- `npm test -- ai-orchestrator -- --runInBand`: passed (`12` files, `73` tests)
- `npm test -- StockDetail -- --runInBand`: passed
- `npm run test:unit`: passed (`210` files, `2053` tests passed, `7` skipped)

## Confirmations
- Backend untouched: yes
- Provider changes: none
- Official scores remain deterministic: yes
- Local AI is explanation-only: yes
- No fake data outside tests: yes
- No secrets committed: yes
- No broker execution changes: yes
- No recommendation language in public-facing AI explanation copy: yes
- No public backend/provider/model/runtime leakage: yes
