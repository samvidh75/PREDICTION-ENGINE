# StockStory India — Part 9: Scenario Simulation & Stress Testing

## Baseline Report

**Date**: 2026-06-28
**Baseline Commit**: `95b80ce6244268387d4e9d6af53ec4e88b9af075`
**Branch**: `main`

### Baseline Verification Results

| Check | Status |
|-------|--------|
| `git pull --ff-only origin main` | ✅ Fast-forward to `95b80ce6` |
| `npm run typecheck` | ✅ Passed (frontend + backend) |
| `npm run lint` | ✅ Passed |
| `npm run test:unit` | ✅ 1423 passed, 7 skipped (CI-gated), 0 failures |
| `npm run build:frontend` | ✅ Built to `dist/public/` |
| `npm run build:backend` | ✅ Compiled to `dist/backend/` |

### Current Intelligence Modules

- **90 TypeScript files** across 15+ subdirectories under `src/stockstory/intelligence/`
- **10 core engines**: Financial, Technical, Valuation, Risk, Sector, News, Earnings, Event, RAG, LLM
- **Deep subsystems**: CompanyProfileFactory, SectorProfileBuilder, RiskRadarEngine, TechnicalRegimeEngine, ValuationRegimeEngine, EarningsQualityEngine, MoatEngine, GovernanceRiskEngine, OwnershipEngine, ThesisLifecycleEngine, OpportunityClassifierEngine, FactorAttributionEngine
- **Orchestrators**: StockStoryOrchestrator (base 9-engines), DeepStockStoryOrchestrator (all 20 engines)
- **Quality/Compliance**: EvidenceBounder, ComplianceTextGuard, OutputSanitizer, SafetyAuditor
- **Validation**: IntelligenceValidationRunner, MarketRealityValidator, ResearchConsistencyValidator

### Current Scenario-Related Code

- No `scenario/` directory exists in `src/stockstory/intelligence/`
- `ThesisLifecycleEngine.ts` has `thesisState` logic (10 references)
- `RiskEngine.ts` has risk classification (5 references)
- Various scripts (track28_alpha.cjs, track53_certify.cjs) mention scenario concepts but are not integrated into the intelligence pipeline

### Current API Routes

- `GET /api/intelligence/stock` — single stock analysis
- `GET /api/intelligence/exchange/:exchange` — exchange-level analysis (placeholder)
- `POST /api/intelligence/batch` — batch analysis

### Current Frontend Intelligence Surfaces

- Company research page
- Watchlist page
- Portfolio thesis monitor (placeholder)

### Scope of This Phase

Build a comprehensive scenario simulation and stress testing layer with:
- 14 scenario simulator modules
- Scenario types, registry, presets, orchestrator
- Explainability, validation, persistence
- API routes and frontend integration
- Full test coverage and compliance validation
