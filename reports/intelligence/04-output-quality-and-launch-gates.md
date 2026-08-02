# StockStory Output Quality & Launch Gates — Phase 4

## Baseline

- **Commit**: `85ba4031 Save uncommitted changes` (on main)
- **Repository**: samvidh75/PREDICTION-ENGINE (no branch — working on main)
- **Goal**: Make intelligence output trustworthy, factual, compliance-safe, measurable, and production-ready.

## Current Intelligence Architecture

StockStory uses a multi-engine intelligence system with 9 engines coordinated by a master orchestrator:

| Engine | Status |
|--------|--------|
| FinancialEngine | ✅ Complete |
| TechnicalEngine | ✅ Complete |
| ValuationEngine | ✅ Complete |
| MomentumEngine | ✅ Complete |
| QualityEngine | ✅ Complete |
| GrowthEngine | ✅ Complete |
| RiskEngine | ✅ Complete |
| SectorEngine | ✅ Complete |
| News/SentimentEngine | ✅ Complete |
| EarningsEngine | ✅ Complete |

### Orchestrator Flow

1. User requests a symbol analysis
2. Orchestrator queries all engines in parallel
3. Results are merged into a unified `StockIntelligenceReport`
4. LLM Explainer generates natural language narrative
5. Deterministic fallback (when no LLM key)
6. Research cached via snapshot system

## Current LLM Provider Strategy

- Uses `ExternalLLMProvider` (src/services/ai/ExternalLLMProvider.ts) — a generic LLM provider
- `LLMExplainer` wraps the provider and generates research narratives
- `DeterministicResearchProvider` exists as fallback when LLM is unavailable
- Currently no structured output schemas, no evidence-bound claims

## Current RAG Status

- RAG engine exists in `src/stockstory/intelligence/rag/`
- `VectorStore` exists but Qdrant is optional
- PostgreSQL-based fallback for vector search
- RAG knowledge base migration in `supabase/migrations/rag_knowledge_base.sql`

## Current Research Cache Behavior

- `ResearchSnapshotCache` exists — caches full research output per symbol
- Cache key based on symbol
- No input hash / version-based invalidation yet
- No engine/prompt/scoring versioning

## Current Public API Routes

- `GET /api/research/:symbol` — returns full intelligence report
- `GET /api/scanner` — scanner/ranking data
- `GET /api/compare` — comparison data
- `GET /api/watchlist/alerts` — watchlist alerts

## Current Frontend Intelligence Sections

Research output is displayed in frontend pages showing thesis, bull case, bear case, risks, valuation explanation, earnings summary, peer comparison, and watchlist alerts.

## Current Test Coverage

- **Unit tests**: 1328 pass, 7 skipped
- **Lint**: Clean (pre-existing `src/services/retention` glob warning)
- **TypeScript**: typecheck:frontend ✅, typecheck:backend ✅
- **Build**: frontend ✅, backend ✅
- **Hygiene**: ✅ (1 pre-existing warning about console.log of potential secret)

## Scope of This Phase

1. Evidence-bound research schema
2. Claim validation layer (numeric, forbidden language, output sanitizer)
3. LLM prompt hardening with structured schemas
4. Deterministic fallback upgrade
5. RAG grounding hardening
6. Research confidence model
7. Research snapshot versioning
8. Evaluation dataset & golden tests
9. Public API quality gates
10. Frontend quality gates
11. Compliance safety layer
12. Launch readiness checklist
13. Production verification script
14. Safety greps
15. Comprehensive tests
16. Final verification and reports
