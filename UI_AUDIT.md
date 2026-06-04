# UI_AUDIT

Evidence-based audit of the user-facing surfaces requested for RC3.

## Audit criteria
- **Renders successfully?** Based on code inspection and runtime evidence where available.
- **Uses live data?** Fetches from backend or live providers during render.
- **Uses snapshot data?** Uses DB snapshots, cached syntheses, or precomputed intelligence.
- **Uses mock data?** Uses hardcoded/static datasets.
- **Known issues?** Concrete issues observed from code/runtime.

---

## Dashboard

### DashboardHub
- Renders successfully? **WORKING**
- Uses live data? **PARTIAL**
- Uses snapshot data? **PARTIAL**
- Uses mock data? **YES**
- Evidence:
  - `src/views/DashboardHub.tsx`
  - Uses `NewsCoordinator.getTopNews()` → static `MOCK_NEWS`.
  - Uses `PersonalisationEngine` and `BehaviourCoordinator` backed by local in-memory history stores.
  - Renders `SectorExplorer` and `MarketExplorer` (live API + registry-backed).
  - Uses static index cards with hardcoded values for NIFTY/SENSEX/NSE Emerge.
- Known issues:
  - Mixed data model: live market exploration coexists with static index values and local-memory personalization.
  - News feed is fully mock/static.
  - “Beginner Mode” only toggles UI density; it does not switch data source quality.

### MarketIntelligenceDashboard
- Renders successfully? **WORKING**
- Uses live data? **NO**
- Uses snapshot data? **NO**
- Uses mock data? **YES**
- Evidence:
  - `src/pages/MarketIntelligenceDashboard.tsx`
  - `src/components/dashboard/MarketIntelligenceCommandCentre.tsx`
  - Static sections, static price card, static healthometer card, static quick stats, static `PredictivePanel`.
- Known issues:
  - The “search” field is present but does not visibly submit to backend in this component.

### AdaptiveDashboardShell
- Renders successfully? **NOT VERIFIED**
- Uses live data? **NOT VERIFIED**
- Uses snapshot data? **NOT VERIFIED**
- Uses mock data? **NOT VERIFIED**
- Evidence:
  - Not directly read in this audit session.
- Known issues:
  - Not enough runtime/code evidence captured to classify beyond not verified.

---

## CompanySuperpage

### CompanySuperpage
- Renders successfully? **WORKING**
- Uses live data? **YES**
- Uses snapshot data? **YES**
- Uses mock data? **PARTIAL**
- Evidence:
  - `src/views/CompanySuperpage.tsx`
  - `src/components/company/CompanySuperpage.tsx`
  - `useCompanyData(symbol)` → `MarketDataOrchestrator.fetchCompanyData(symbol)` calls `/api/market-data/company/:symbol`.
  - `useCompanyTelemetry(data)` creates a telemetry snapshot.
  - `fetch('/api/intelligence/company/:symbol')`, `/api/intelligence/market`, `/api/intelligence/portfolio`.
  - Fallback text appears when data is missing.
- Known issues:
  - Uses `any` for several intelligence state values.
  - `fetch` calls swallow errors (`catch(() => {})`), so failures degrade silently.
  - Some fields in the backend intelligence responses are fallback defaults when DB rows are absent.
  - The view relies on route param `id`; invalid/missing ids fall back to `INFY`.

---

## SectorExplorer

### SectorExplorer
- Renders successfully? **WORKING**
- Uses live data? **YES**
- Uses snapshot data? **NO**
- Uses mock data? **YES**
- Evidence:
  - `src/components/discovery/SectorExplorer.tsx`
  - On mount, fetches `/api/intelligence/sector/:sector` for each sector.
  - Falls back to static sector definitions if live fetch fails.
  - Uses `StockRegistry.getAllStocks()` for sector asset rows.
- Known issues:
  - Live request failures are swallowed.
  - Static sector definitions remain visible if backend is unavailable.
  - Top stock click routing uses `window.location.search = ...`, which is a hard navigation and bypasses richer app state transitions.

---

## PortfolioPage

### PortfolioPage
- Renders successfully? **WORKING**
- Uses live data? **PARTIAL**
- Uses snapshot data? **YES**
- Uses mock data? **YES**
- Evidence:
  - `src/pages/PortfolioPage.tsx`
  - `PortfolioSnapshotFactory.createSnapshot()` produces the page’s core portfolio view.
  - `PersonalInsightsEngine.generateInsights(snapshot)` derives insights from that snapshot.
  - `AlertEngine.getAlerts()` returns static alerts.
  - `fetch('/api/intelligence/portfolio', { method: 'POST' })` sends computed positions to backend intelligence.
  - `PortfolioCoach.generateFeedback(..., 32, 5.2)` uses mock volatility/drawdown inputs.
- Known issues:
  - The portfolio state is mostly local snapshot state, not live brokerage/account data.
  - The coach and alerts are partly static/mock.
  - Backend portfolio intelligence is optional rather than the source of truth.

---

## MarketStories

### MarketStories
- Renders successfully? **WORKING**
- Uses live data? **NO**
- Uses snapshot data? **PARTIAL**
- Uses mock data? **YES**
- Evidence:
  - `src/views/MarketStories.tsx`
  - Static story catalog (`STORY_CATALOG`) and progress integration from `AcademyContext`.
  - Modal viewer is driven entirely by static content.
- Known issues:
  - No live market or backend intelligence dependency.
  - Content is editorial/static.
  - `src/views/MarketStories.jsx` exists as a parallel legacy view, but the TSX implementation is the auditable one.

---

## CommandCentreSearch

### CommandCentreSearch
- Renders successfully? **PARTIAL**
- Uses live data? **NO**
- Uses snapshot data? **NO**
- Uses mock data? **YES**
- Evidence:
  - The searchable input surface in `src/components/dashboard/MarketIntelligenceCommandCentre.tsx`.
  - Quick-search buttons are static labels only.
- Known issues:
  - No visible submission or backend query wiring in the component.
  - Search is present as UI chrome, not as an operational search flow.
  - Because there is no separate `CommandCentreSearch` module read in this session, the exact component identity is partially inferred from the dashboard command centre.

---

## Overall UI state

- **Strongest working surfaces:** CompanySuperpage, SectorExplorer, PortfolioPage, DashboardHub, MarketStories.
- **Most live-data-backed surface:** CompanySuperpage and SectorExplorer.
- **Most snapshot/static surface:** MarketStories and MarketIntelligenceCommandCentre.
- **Largest UI risk:** mixed data sources with silent fallback behavior, which makes “looks live” and “is live” diverge.
