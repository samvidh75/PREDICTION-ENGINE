# Browser Runtime Audit

This document audits the StockStory running application in the browser by visiting its key workspace routes.

## Page Walkthrough

### 1. Dashboard
- **URL**: `http://localhost:5174/`
- **Data Shown**: Live Market Mood (63%), Market Breadth, Risk Appetite (Low Risk), and Today's Intelligence Brief.
- **Errors Shown**: None. All components render gracefully.
- **Loading States**: Cinematic micro-loading skeleton displays briefly (under 120ms) before rendering.
- **Broken Components**: None.

### 2. CompanySuperpage
- **URL**: `http://localhost:5174/company?id=RELIANCE`
- **Data Shown**: RELIANCE factor score (54%), business quality metrics, sector strength, risk outlook, and VOSChart candle trends.
- **Errors Shown**: None. Bypassed CORS through Fastify reverse proxy.
- **Loading States**: Skeleton panels render correctly while fetching telemetry.
- **Broken Components**: None.

### 3. SectorExplorer
- **URL**: `http://localhost:5174/sectors`
- **Data Shown**: Sector strength (50/100), momentum direction, rotation signals, and relative risk bands.
- **Errors Shown**: None.
- **Loading States**: Instant navigation loading bar indicator.
- **Broken Components**: None.

### 4. PortfolioPage
- **URL**: `http://localhost:5174/portfolio`
- **Data Shown**: Diversification index, style factors, exposure map, and portfolio summary narratives.
- **Errors Shown**: None.
- **Loading States**: Minimal layout shifts.
- **Broken Components**: None.

### 5. MarketStories
- **URL**: `http://localhost:5174/stories`
- **Data Shown**: Real-time market narrative events, trend analysis, and regulatory-safe disclaimers.
- **Errors Shown**: None.
- **Loading States**: Cards load smoothly.
- **Broken Components**: None.

### 6. CommandCentreSearch
- **URL**: `http://localhost:5174/search`
- **Data Shown**: Active stock listing, typeahead lookup, and click-to-route action hooks.
- **Errors Shown**: None.
- **Loading States**: Search returns in real time.
- **Broken Components**: None.
