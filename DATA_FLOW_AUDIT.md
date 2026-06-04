# DATA_FLOW_AUDIT

End-to-end data-flow audit for the requested platform surfaces.

## CompanySuperpage

### Flow A — live company telemetry + intelligence
**UI → Component → Provider/Gateway → Engine → Database/API**

1. `src/views/CompanySuperpage.tsx`
2. `src/components/company/CompanySuperpage.tsx`
3. `useCompanyData(symbol)` in `src/hooks/useCompanyData.ts`
4. `MarketDataOrchestrator.fetchCompanyData(symbol)` in `src/services/api/MarketDataOrchestrator.ts`
5. Backend route `GET /api/market-data/company/:symbol`
6. `MarketDataGateway.getQuote()` and `getCompany()` in `src/services/data/MarketDataGateway.ts`
7. `ProviderCoordinator` in `src/services/providers/ProviderCoordinator.ts`
8. Provider chain:
   - Quote: `YahooProvider`
   - Metadata: `YahooProvider` then `FinnhubProvider`
   - Historical: `YahooProvider`
9. `useCompanyTelemetry()` in `src/services/telemetry/useCompanyTelemetry.ts`
10. `TelemetrySnapshotFactory`
11. UI render components:
   - `TelemetryPanel`
   - `TelemetryMetrics`
   - `VOSChart`
   - `RangeInfographic`
   - `BrokerRedirector`

### Flow B — intelligence overlay
**UI → Component → Backend API → DB snapshots / fallback snapshot**

1. `src/components/company/CompanySuperpage.tsx`
2. `fetch('/api/intelligence/company/:symbol')`
3. Backend route `GET /api/intelligence/company/:symbol`
4. PostgreSQL queries:
   - `symbols`
   - `feature_snapshots`
   - `factor_snapshots`
5. Engines:
   - `InsightEngine`
   - `CompanyIntelligenceEngine`
   - `SectorIntelligenceEngine`
   - `NarrativeEngine`
6. If DB rows are missing, route returns fallback intelligence snapshot.
7. UI renders intelligence cards from the returned payload.

### Data-flow classification
- **Primary flow:** UI ↓ live market-data API ↓ provider coordinator ↓ Yahoo provider
- **Secondary flow:** UI ↓ intelligence API ↓ DB snapshot / fallback snapshot
- **Assessment:** **PARTIAL live**, **PARTIAL snapshot**, fallback-heavy when DB or news providers fail.

---

## Dashboard

### Flow A — market terminal + news + personalization
**UI → Local services + registry + live sector explorer**

1. `src/views/DashboardHub.tsx`
2. Services:
   - `NewsCoordinator.getTopNews()` → static `MOCK_NEWS`
   - `PersonalisationEngine.getPersonalizedGreeting()`
   - `PersonalisationEngine.getSuggestedStocks()`
   - `BehaviourCoordinator.getRecentlyViewedSymbols()`
3. Live/registry-backed components:
   - `SectorExplorer` → `/api/intelligence/sector/:sector`
   - `MarketExplorer` → `StockRegistry.getAllStocks()`
4. UI renders:
   - static index cards
   - mock news cards
   - live sector explorer tiles
   - registry-backed stock suggestions

### Data-flow classification
- **Primary flow:** UI ↓ mock/static services + registry
- **Secondary flow:** UI ↓ sector intelligence API
- **Assessment:** **MIXED**, but mostly **snapshot/mock**.

---

## SectorExplorer

**UI → Component → Backend API → Engine → discovery graph / discovery index**

1. `src/components/discovery/SectorExplorer.tsx`
2. On mount: `fetch('/api/intelligence/sector/:sector')`
3. Backend route `GET /api/intelligence/sector/:sector`
4. `sectorIntelligenceEngine.generateSectorReport(sector)`
5. Support data:
   - `StockRegistry.getAllStocks()`
   - static sector definitions
6. UI falls back to static sector definitions if fetch fails.

### Data-flow classification
- **Primary flow:** UI ↓ intelligence API ↓ sector engine
- **Fallback flow:** UI ↓ static sector definitions + registry
- **Assessment:** **PARTIAL live**, **PARTIAL static fallback**.

---

## PortfolioPage

**UI → Snapshot factory → local portfolio engines → optional backend portfolio intelligence**

1. `src/pages/PortfolioPage.tsx`
2. `PortfolioSnapshotFactory.createSnapshot()`
3. `PortfolioEngine.getHoldings()`
4. `PortfolioAnalyticsEngine.calculateWeights()`
5. `PortfolioHealthEngine.evaluateHealth()`
6. `PortfolioRiskEngine.analyzeRisk()`
7. `PortfolioPerformanceEngine.evaluatePerformance()`
8. `PersonalInsightsEngine.generateInsights(snapshot)`
9. `AlertEngine.getAlerts()`
10. `PortfolioCoach.generateFeedback(...)` with mock volatility/drawdown
11. Optional backend call:
    - `POST /api/intelligence/portfolio`
12. Backend route:
    - `portfolioIntelligenceEngine.evaluatePortfolio(positions)`

### Data-flow classification
- **Primary flow:** UI ↓ local snapshot engines
- **Secondary flow:** UI ↓ backend portfolio intelligence API
- **Assessment:** **SNAPSHOT-FIRST**, backend intelligence is supplemental.

---

## MarketStories

**UI → Static editorial content + progress context**

1. `src/views/MarketStories.tsx`
2. Static `STORY_CATALOG`
3. `useAcademyProgress()` from `AcademyContext`
4. `CourseCategoryRow` and `StoryLessonViewer`
5. No live API calls.

### Data-flow classification
- **Primary flow:** UI ↓ static content
- **Assessment:** **STATIC / SNAPSHOT-ONLY**.

---

## MarketCommandCentre / MarketIntelligenceDashboard

**UI → Static command-centre surface + live synthesis engines**

1. `src/pages/MarketIntelligenceDashboard.tsx`
2. `src/components/dashboard/MarketIntelligenceCommandCentre.tsx`
3. `PredictivePanel` and static summary cards
4. `src/pages/MarketCommandCentrePage.tsx`
5. `useConfidenceEngine()`
6. `useNeuralMarketSynthesisSuperengine()`
7. `MarketService` / `MarketStateEngine`
8. `HolographicTelemetryEngine`, `MarketScannerEngine`, `MacroIntelligenceEngine`

### Data-flow classification
- **Dashboard page:** mostly **STATIC**
- **CommandCentrePage:** **LIVE SYNTHESIS + synthetic market stream**
- **Assessment:** mixed; the dashboard variant is mostly a presentation shell.

---

## Discovery search

**UI/API → discovery index + query heuristics**

1. `src/backend/web/routes/search.ts`
2. `predictiveDiscoveryArchitecture.generatePredictions(query)`
3. `universalIntelligenceSearch(...)`
4. `getDiscoveryIndex()`
5. `DiscoveryGraphEngine`

### Data-flow classification
- **Primary flow:** search UI/API ↓ discovery index + heuristics
- **Assessment:** **WORKING**, non-DB, deterministic graph/search flow.

---

## Overall data-flow assessment
- **Live provider path works best for quotes/history.**
- **Database-backed intelligence works, but often falls back to defaults.**
- **Portfolio and market-stories surfaces are mostly local/static.**
- **The largest gap is that runtime backend Postgres attachment is inconsistent even though the schema and data exist.**
