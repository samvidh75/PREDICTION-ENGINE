# ALGORITHM_AUDIT

Evidence-based audit of the major algorithmic engines requested for RC3.

## FeatureEngine
- Implemented? **PARTIAL**
- Validated? **NOT VERIFIED**
- Called by UI? **NOT VERIFIED**
- Runtime execution? **NOT VERIFIED**
- Snapshot only? **NOT VERIFIED**
- Evidence:
  - Engine file exists in `src/services`.
  - Not directly read or runtime-tested in this session.

## FactorEngine
- Implemented? **PARTIAL**
- Validated? **NOT VERIFIED**
- Called by UI? **NOT VERIFIED**
- Runtime execution? **NOT VERIFIED**
- Snapshot only? **NOT VERIFIED**
- Evidence:
  - Engine file exists in `src/services`.
  - `src/backend/web/routes/intelligence.ts` reads `factor_snapshots` and drives factor narratives.
  - Direct engine runtime was not isolated in this session.

## ExplanationEngine
- Implemented? **PARTIAL**
- Validated? **NOT VERIFIED**
- Called by UI? **NOT VERIFIED**
- Runtime execution? **NOT VERIFIED**
- Snapshot only? **PARTIAL**
- Evidence:
  - `reports/PROVIDER_CHAIN_REPORT.json` and `reports/VALIDATION_RESULTS.json` show explanation/narrative outputs are generated.
  - The engine file itself was not read in this session.

## InsightEngine
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **PARTIAL**
- Runtime execution? **WORKING**
- Snapshot only? **PARTIAL**
- Evidence:
  - Imported and used in `src/backend/web/routes/intelligence.ts`.
  - Live `GET /api/intelligence/company/RELIANCE` returned insight output.
  - Output depends on DB-backed feature/factor snapshots when available, or fallback snapshot logic otherwise.

## CompanyIntelligenceEngine
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **PARTIAL**
- Runtime execution? **WORKING**
- Snapshot only? **PARTIAL**
- Evidence:
  - Imported in `src/backend/web/routes/intelligence.ts`.
  - Live company intelligence endpoint returned a company outlook object.
  - Route uses fallback data when `feature_snapshots`/`factor_snapshots` are absent.

## SectorIntelligenceEngine
- Implemented? **WORKING**
- Validated? **PARTIAL**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **PARTIAL**
- Evidence:
  - Imported in `src/backend/web/routes/intelligence.ts`.
  - `SectorExplorer` calls `/api/intelligence/sector/:sector`.
  - The backend route exists and is used by the UI.
  - Direct standalone engine output was not separately probed.

## MarketIntelligenceEngine
- Implemented? **WORKING**
- Validated? **PARTIAL**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **PARTIAL**
- Evidence:
  - Imported in `src/backend/web/routes/intelligence.ts`.
  - The `MarketIntelligenceDashboard` page renders a command-centre view, though the UI surface itself is mostly static.
  - Backend route exists for `/api/intelligence/market`.

## PortfolioIntelligenceEngine
- Implemented? **WORKING**
- Validated? **PARTIAL**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **PARTIAL**
- Evidence:
  - Imported in `src/backend/web/routes/intelligence.ts`.
  - `PortfolioPage` calls `/api/intelligence/portfolio` via GET/POST.
  - Route returns portfolio diversification, factor exposure, and narrative.

## NarrativeEngine
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **PARTIAL**
- Runtime execution? **WORKING**
- Snapshot only? **PARTIAL**
- Evidence:
  - Imported in `src/backend/web/routes/intelligence.ts`.
  - Live company intelligence response contained structured narratives.
  - Generates narrative text from feature/factor intelligence and fallback snapshots.

## CompanyDNAEngine
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **NO**
- Evidence:
  - `src/views/CompanySuperpage.tsx` computes `dna` via `CompanyDNAEngine.compute(registeredStock)`.
  - Uses `StockRegistry` data.
  - Renders corporate DNA cards on the company page.

## CompanyUniverse engine/model
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **PARTIAL**
- Evidence:
  - `src/services/company/useCompanyUniverseModel.ts`
  - `src/pages/CompanyUniversePage.tsx`
  - Model is deterministic from ticker + narrative key, then sanitized.
  - It is a synthetic model, not a live market API feed.

## Healthometer engine stack
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **PARTIAL**
- Evidence:
  - `src/services/intelligence/marketState.ts`
  - `src/services/market/marketStateEngine.ts`
  - `src/backend/web/routes/healthometer.ts`
  - Live `/api/healthometer/state` returned a structured healthometer response.

## DiscoveryGraphEngine
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **NO**
- Evidence:
  - `src/backend/search/discoveryGraphEngine.ts`
  - `src/backend/web/routes/discovery.ts`
  - live `/api/discovery/index` response and `/api/discovery/related` implementation.
  - Graph is built from the discovery index, not from market snapshots.

## PredictiveDiscoveryArchitecture
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **NO**
- Evidence:
  - `src/services/search/PredictiveDiscoveryArchitecture.ts`
  - `src/backend/web/routes/search.ts`
  - live `/api/search/universal` response.
  - Produces predictions from discovery index + query heuristics + recent searches.

## NeuralMarketSynthesisEngine
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **PARTIAL**
- Evidence:
  - `src/services/synthesis/neuralMarketSynthesisEngine.ts`
  - `src/services/synthesis/useNeuralMarketSynthesisSuperengine.ts`
  - `src/backend/web/routes/healthometer.ts`
  - Produces synthetic market narrative, scanner cards, liquidity/institutional/behavioural text.
  - Relies on market-state inputs and synthetic data composition rather than external live market sources.

## PortfolioSnapshotFactory
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **YES**
- Evidence:
  - `src/services/portfolio/PortfolioSnapshotFactory.ts`
  - `src/pages/PortfolioPage.tsx`
  - Produces a local portfolio snapshot used directly by UI.

## PersonalInsightsEngine
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **YES**
- Evidence:
  - `src/services/portfolio/PersonalInsightsEngine.ts`
  - `src/pages/PortfolioPage.tsx`
  - Generates insights from the local portfolio snapshot.

## AlertEngine
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **YES**
- Evidence:
  - `src/services/portfolio/AlertEngine.ts`
  - `src/pages/PortfolioPage.tsx`
  - Static alert list with in-memory mutation support.

## SmartWatchlistEngine / WatchlistEngine
- Implemented? **WORKING**
- Validated? **WORKING**
- Called by UI? **WORKING**
- Runtime execution? **WORKING**
- Snapshot only? **YES**
- Evidence:
  - `src/services/portfolio/SmartWatchlistEngine.ts`
  - `src/services/portfolio/WatchlistEngine.ts`
  - `src/pages/WatchlistPage.tsx`
  - `src/components/portfolio/ResearchWorkspace.tsx`

## Overall algorithm assessment
- **Strongest live algorithms:** discovery graph/search, healthometer, neural market synthesis, market-data provider routing.
- **Most snapshot-driven algorithms:** portfolio insights, alerts, watchlists, company universe model.
- **Biggest weakness:** several engine families are implemented but not independently runtime-verified, and some outputs rely on synthetic or fallback data rather than live market feeds.
