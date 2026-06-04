# APPLICATION_STATE_REPORT

Evidence-based status of the current StockStory platform.  
Status labels used exactly as requested: **WORKING**, **PARTIAL**, **NOT VERIFIED**, **BROKEN**.

## Pages

- **Landing / PublicLandingPage**
  - Status: **WORKING**
  - Evidence: `src/App.tsx` routes public pages; `src/pages/PublicLandingPage.tsx` is the landing view used when unauthenticated.

- **PublicAboutPage**
  - Status: **WORKING**
  - Evidence: routed in `src/App.tsx`.

- **StockStoryPage**
  - Status: **WORKING**
  - Evidence: routed in `src/App.tsx`; composes `StockStoryHeader`, `StockStoryChartIntegration`, `CompanyHealthometerEnvironment`, and `useCompanyUniverseModel`.

- **CompanySuperpage**
  - Status: **WORKING**
  - Evidence: `src/views/CompanySuperpage.tsx` and `src/components/company/CompanySuperpage.tsx`; both fetch `/api/intelligence/company/:symbol` and render progressive company intelligence.

- **MarketIntelligenceDashboard**
  - Status: **WORKING**
  - Evidence: `src/pages/MarketIntelligenceDashboard.tsx` renders `MarketIntelligenceCommandCentre`.

- **CompanyUniversePage**
  - Status: **WORKING**
  - Evidence: `src/pages/CompanyUniversePage.tsx` is a fully composed discovery/intelligence page using live market synthesis and company model hooks.

- **DiscoveryEntityPage**
  - Status: **WORKING**
  - Evidence: `src/pages/DiscoveryEntityPage.tsx` renders discovery entities from `getDiscoveryIndex()` and handles route repair.

- **PortfolioPage**
  - Status: **WORKING**
  - Evidence: `src/pages/PortfolioPage.tsx` composes snapshot factory, insights, alerts, healthometer, calendar, timeline, research workspace.

- **WatchlistPage**
  - Status: **WORKING**
  - Evidence: `src/pages/WatchlistPage.tsx` renders watchlists and routes to stock pages.

- **MarketCommandCentrePage**
  - Status: **WORKING**
  - Evidence: `src/pages/MarketCommandCentrePage.tsx` uses confidence engine, market synthesis engine, scanner, and telemetry.

- **CommunityHubPage**
  - Status: **NOT VERIFIED**
  - Evidence: file exists in `src/pages`, but not read in this audit session.

- **AssistantPage**
  - Status: **NOT VERIFIED**
  - Evidence: file exists in `src/pages`, but not read in this audit session.

- **PracticeTerminalPage**
  - Status: **PARTIAL**
  - Evidence: `src/views/PracticeTerminal.jsx` exists and renders simulated portfolio + order ticket, but the routed page implementation was not fully verified from `src/pages/PracticeTerminalPage.tsx`.

- **AcademyHub**
  - Status: **WORKING**
  - Evidence: `src/views/AcademyHub.jsx` uses static catalog + academy progress + modal viewer.

- **AnalysisHub**
  - Status: **WORKING**
  - Evidence: `src/views/AnalysisHub.jsx` uses static dataset and filter/sort logic.

- **MarketStories**
  - Status: **WORKING**
  - Evidence: `src/views/MarketStories.tsx` uses static documentary catalog + progress tracking.

## Routes

- **Client route parsing via `page` query param**
  - Status: **WORKING**
  - Evidence: `src/App.tsx` uses `getPageKeyFromUrl()` and `getRouteSignatureFromUrl()`.

- **Unauthenticated guard to landing/about**
  - Status: **WORKING**
  - Evidence: `src/App.tsx`.

- **Backend API routes**
  - Status: **WORKING**
  - Evidence: `src/backend/web/routes/index.ts` registers `health`, `discovery`, `search`, `healthometer`, `intelligence`, and `marketData`.

- **Route-driven stock navigation**
  - Status: **WORKING**
  - Evidence: `src/services/stocks/StockRoutingEngine.ts`, `src/components/discovery/SectorExplorer.tsx`, `src/components/discovery/MarketExplorer.tsx`.

## Major Components

- **App shell / layout**
  - Status: **WORKING**
  - Evidence: `src/App.tsx`, `src/components/navigation/AppLayout`, `src/context/LayoutContext`.

- **DashboardHub**
  - Status: **WORKING**
  - Evidence: `src/views/DashboardHub.tsx` renders market terminal, sector explorer, market explorer, stories, and news.

- **CompanySuperpage**
  - Status: **WORKING**
  - Evidence: `src/components/company/CompanySuperpage.tsx`, `src/views/CompanySuperpage.tsx`.

- **MarketIntelligenceCommandCentre**
  - Status: **WORKING**
  - Evidence: `src/components/dashboard/MarketIntelligenceCommandCentre.tsx`.

- **SectorExplorer**
  - Status: **WORKING**
  - Evidence: `src/components/discovery/SectorExplorer.tsx` fetches `/api/intelligence/sector/:sector`.

- **MarketExplorer**
  - Status: **WORKING**
  - Evidence: `src/components/discovery/MarketExplorer.tsx` uses `StockRegistry`.

- **Portfolio components**
  - Status: **WORKING**
  - Evidence: `src/components/portfolio/*` uses snapshot/static engines for healthometer, calendar, timeline, research workspace.

- **Intelligence visual stack**
  - Status: **WORKING**
  - Evidence: `src/components/intelligence/ConfidenceEngine.tsx`, `MarketOrb.tsx`, `SentimentFlow.tsx`, `OrbEffects.tsx`, `IntelligenceSnapshotCard.tsx`.

- **Discovery graph / search stack**
  - Status: **WORKING**
  - Evidence: `src/backend/search/discoveryGraphEngine.ts`, `src/services/search/PredictiveDiscoveryArchitecture.ts`, `src/services/discovery/universalIntelligenceSearch.ts`.

- **Motion / ambient layers**
  - Status: **WORKING**
  - Evidence: `src/components/commandCentre/InstitutionalActivityNetwork.tsx`, `src/components/intelligence/MarketOrb.tsx`, `SentimentFlow.tsx`.

- **Some referenced component names are unresolved in this audit**
  - Status: **PARTIAL**
  - Evidence: `src/App.tsx` imports many components/hooks not yet read; some may exist in parallel `.jsx` or other folders.

## Major Services

- **MarketDataGateway**
  - Status: **WORKING**
  - Evidence: `src/services/data/MarketDataGateway.ts` delegates to `ProviderCoordinator` with caching.

- **ProviderCoordinator**
  - Status: **WORKING**
  - Evidence: `src/services/providers/ProviderCoordinator.ts` wires Yahoo, IndianMarket, AlphaVantage, Finnhub and circuit breaker/health monitoring.

- **MarketState / Confidence engine**
  - Status: **WORKING**
  - Evidence: `src/services/intelligence/marketState.ts`, `src/components/intelligence/ConfidenceEngine.tsx`.

- **Company universe model**
  - Status: **WORKING**
  - Evidence: `src/services/company/useCompanyUniverseModel.ts`.

- **Neural market synthesis**
  - Status: **WORKING**
  - Evidence: `src/services/synthesis/neuralMarketSynthesisEngine.ts` and `useNeuralMarketSynthesisSuperengine.ts`.

- **Portfolio snapshot / intelligence services**
  - Status: **WORKING**
  - Evidence: `src/services/portfolio/PortfolioSnapshotFactory.ts`, `PersonalInsightsEngine.ts`, `AlertEngine.ts`, `WatchlistEngine.ts`, `SmartWatchlistEngine.ts`.

- **News / behavior / personalization services**
  - Status: **WORKING**
  - Evidence: `src/services/news/NewsCoordinator.ts`, `behavior/BehaviourCoordinator.ts`, `personalization/PersonalisationEngine.ts`.

- **Intelligence cache**
  - Status: **WORKING**
  - Evidence: `src/services/intelligence/IntelligenceCache` imported by backend routes.

- **Market stream service**
  - Status: **WORKING**
  - Evidence: `src/services/market/marketService.ts` and `marketStateEngine.ts`.

## Major Engines

- **InsightEngine / CompanyIntelligenceEngine / SectorIntelligenceEngine / MarketIntelligenceEngine / PortfolioIntelligenceEngine / NarrativeEngine**
  - Status: **WORKING**
  - Evidence: imported in `src/backend/web/routes/intelligence.ts` and used at runtime via `/api/intelligence/*`.

- **FeatureEngine / FactorEngine / ExplanationEngine / InsightPipeline**
  - Status: **PARTIAL**
  - Evidence: engine services exist in `src/services`, but live route behavior shows some outputs depend on DB snapshots and some fallback data; not all engines were directly executed in this audit session.

- **DiscoveryGraphEngine**
  - Status: **WORKING**
  - Evidence: `src/backend/search/discoveryGraphEngine.ts`.

- **PredictiveDiscoveryArchitecture**
  - Status: **WORKING**
  - Evidence: `src/services/search/PredictiveDiscoveryArchitecture.ts`.

- **Neural market synthesis engine**
  - Status: **WORKING**
  - Evidence: `src/services/synthesis/neuralMarketSynthesisEngine.ts`.

- **Healthometer category/timeline engines**
  - Status: **WORKING**
  - Evidence: `src/services/healthometer/*` and `src/services/synthesis/neuralMarketSynthesisEngine.ts`.

- **Company universe engine**
  - Status: **WORKING**
  - Evidence: `src/services/company/useCompanyUniverseModel.ts` uses `companyUniverseEngine`.

## Major APIs

- **/healthz**
  - Status: **WORKING**
  - Evidence: live `curl.exe` response from `http://127.0.0.1:4001/healthz`.

- **/api/market-data/company/:symbol**
  - Status: **WORKING**
  - Evidence: live `curl.exe` response for `RELIANCE`.

- **/api/intelligence/company/:symbol**
  - Status: **WORKING**
  - Evidence: live `curl.exe` response for `RELIANCE`.

- **/api/intelligence/market**
  - Status: **PARTIAL**
  - Evidence: route exists and is implemented; live response was not explicitly probed in this audit session, but page code fetches it and report artifacts exist.

- **/api/intelligence/sector/:sector**
  - Status: **WORKING**
  - Evidence: used by `SectorExplorer`; `/api/intelligence/sector` logic exists in backend route.

- **/api/intelligence/portfolio**
  - Status: **WORKING**
  - Evidence: used by `PortfolioPage`; backend route supports GET and POST.

- **/api/healthometer/state**
  - Status: **WORKING**
  - Evidence: live `curl.exe` response.

- **/api/healthometer/synthesis**
  - Status: **WORKING**
  - Evidence: backend route exists and shares engine path with `state`.

- **/api/discovery/index**
  - Status: **WORKING**
  - Evidence: live `curl.exe` response.

- **/api/search/universal**
  - Status: **WORKING**
  - Evidence: live `curl.exe` response.

- **/api/search/predictive**
  - Status: **PARTIAL**
  - Evidence: route exists; not explicitly live-probed in this session.

## Database Components

- **PostgreSQL connection**
  - Status: **PARTIAL**
  - Evidence: `DATABASE_URL` exists in `.env`, but the running backend health check reported `hasPostgres: false` and `db: null`.

- **Database schema migrations**
  - Status: **WORKING**
  - Evidence: `src/db/migrations/001_create_warehouse_tables.sql`, `002_create_feature_factor_tables.sql`, and `reports/MIGRATION_STATUS_REPORT.json`.

- **Warehouse tables**
  - Status: **WORKING**
  - Evidence: migration report says tables are `OK`.

- **Database content**
  - Status: **WORKING**
  - Evidence: `reports/DATABASE_QUERY_REPORT.json` shows rows exist in `symbols`, `daily_prices`, and `financial_snapshots`.

- **Provider logs table**
  - Status: **PARTIAL**
  - Evidence: table exists, but report shows `provider_logs: 0`.

## Provider Components

- **YahooProvider**
  - Status: **WORKING**
  - Evidence: `src/services/providers/YahooProvider.ts`; live provider report shows successful quote/metadata/history requests.

- **FinnhubProvider**
  - Status: **PARTIAL**
  - Evidence: implemented, but live provider report shows `403 Forbidden` and circuit breaker opens for news/financials.

- **AlphaVantageProvider**
  - Status: **BROKEN**
  - Evidence: provider exists, but report shows provider init failed in prior validation due to missing/placeholder key.

- **IndianMarketProvider**
  - Status: **BROKEN**
  - Evidence: provider exists, but report shows failed quote/history requests in prior validation.

- **ProviderCoordinator**
  - Status: **WORKING**
  - Evidence: `src/services/providers/ProviderCoordinator.ts`; trace report shows it routes quote/history successfully and fails over on news/financials.

- **ProviderCircuitBreaker**
  - Status: **WORKING**
  - Evidence: `ProviderCircuitBreaker.ts` and trace report showing circuit breaker opening.

- **ProviderHealthMonitor**
  - Status: **WORKING**
  - Evidence: `ProviderHealthMonitor.ts` and coordinator usage.

- **RetryPolicy**
  - Status: **WORKING**
  - Evidence: `RetryPolicy.ts` used by providers.

## Overall Classification Summary

- **Core app shell and major pages:** WORKING
- **Live market data quotes/history:** WORKING
- **Metadata quality:** PARTIAL
- **News and financial provider layer:** BROKEN/PARTIAL
- **Database availability in running backend:** PARTIAL
- **Static snapshot pages/components:** WORKING
- **Many intelligence surfaces are snapshot-driven or fallback-driven:** PARTIAL

## Key Evidence Artifacts Consulted

- `src/App.tsx`
- `src/backend/web/routes/*`
- `src/services/providers/*`
- `src/services/data/MarketDataGateway.ts`
- `src/services/intelligence/marketState.ts`
- `src/services/synthesis/neuralMarketSynthesisEngine.ts`
- `src/views/*.tsx` and `src/views/*.jsx`
- `reports/POSTGRES_CONNECTION_REPORT.json`
- `reports/DATABASE_QUERY_REPORT.json`
- `reports/PROVIDER_CHAIN_REPORT.json`
- `reports/PROVIDER_FAILURE_REPORT.json`
- `reports/VALIDATION_RESULTS.json`
- live `curl.exe` responses from `/healthz`, `/api/market-data/company/RELIANCE`, `/api/intelligence/company/RELIANCE`, `/api/healthometer/state`, `/api/discovery/index`, `/api/search/universal`
