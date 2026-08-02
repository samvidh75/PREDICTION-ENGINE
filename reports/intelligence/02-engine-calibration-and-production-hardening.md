# StockStory Intelligence Engine — Phase 2 Calibration and Production Hardening

## Baseline Verification (Phase 1)

**Date:** 2026-06-28
**Baseline commit:** `85ba4031` (Save uncommitted changes)

### Verification Results

| Check | Status | Notes |
|-------|--------|-------|
| `git pull --ff-only origin main` | ✅ | Already up to date |
| `typecheck` | ✅ | Frontend + backend pass |
| `lint` | ⚠️ | Pre-existing: `src/services/retention` glob missing (no matching files) |
| `test:unit` | ✅ | 1328 passed, 7 skipped (pre-existing PostgreSQL integration tests) |
| `validate:hygiene` | ✅ | No secrets detected (1 warning: console.log in ExternalLLMProvider) |
| `build:frontend` | ✅ | Built successfully |
| `build:backend` | ✅ | TypeScript compiled + ESM imports fixed |
| `smoke:production` | ⚠️ | 5 Vercel 404s (expected — app runs on Render, not Vercel) |
| `test:e2e` | ⏰ | Timed out after 2 min (not blocking) |

### Current Engine Files

All 9 engines under `src/stockstory/intelligence/engines/`:
- FinancialEngine.ts, TechnicalEngine.ts, ValuationEngine.ts, RiskEngine.ts
- SectorEngine.ts, NewsEngine.ts, EarningsEngine.ts, EventEngine.ts, RAGEngine.ts

Supporting:
- `src/stockstory/intelligence/types.ts` — canonical contracts
- `src/stockstory/intelligence/scoring.ts` — shared utilities
- `src/stockstory/intelligence/rag/KnowledgeBase.ts`
- `src/stockstory/intelligence/llm/LLMExplainer.ts`
- `src/stockstory/intelligence/orchestrator/StockStoryOrchestrator.ts`
- `src/stockstory/intelligence/persistence/IntelligenceCache.ts`
- `src/stockstory/intelligence/api/intelligenceRoutes.ts`
- `src/stockstory/intelligence/index.ts` — barrel export

### Current API Routes

- `GET /api/intelligence/stock/:symbol` — single stock analysis
- `POST /api/intelligence/batch` — batch analysis
- `DELETE /api/intelligence/cache` — clear cache
- `GET /api/intelligence/health` — health check

### Current DB/Cache Setup

- In-memory TTL cache (`IntelligenceCache`)
- No DB persistence for intelligence reports yet
- RAG: in-memory KnowledgeBase with TF-IDF-style keyword retrieval
- PostgreSQL available in codebase but not wired to intelligence engine yet

### Current Production Env Assumptions

- No GPU required
- No Ollama/SGLang/Qdrant required
- LLM provider optional (deterministic fallback works)
- No external AI dependencies for boot

### Pre-existing Issues

1. `lint`: `src/services/retention` glob doesn't exist (irrelevant to intelligence)
2. `smoke:production`: 5 Vercel-proxied endpoints 404 (app runs on Render)
3. `test:e2e`: Times out (pre-existing)

### Scope of This Phase

- Field activation audit (12+ priority fields)
- Canonical input mapper hardening (6 new mapper files)
- All 9 engine calibrations (ROA, dividend yield, market cap, technicals, etc.)
- Orchestrator weights and conviction states
- RAG Knowledge Base hardening
- LLM Explainer guardrails and deterministic fallback
- Ranking impact analysis
- Research cache correctness
- API response hardening
- Frontend integration check
- Production env hardening
- Safety grep
- Comprehensive tests
- Final verification and reports
