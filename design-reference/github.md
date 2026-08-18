repo: samvidh75/PREDICTION-ENGINE
branch: main
path: src

## Last sync
date: 2026-08-18T00:00:00Z

### Updated in this project
- Installed 16 StockStory design pages as the visual source of truth
- Removed dead helper script references so every page loads standalone
- Normalized cross-page navigation links across all 16 screens

## Screen map
| Project screen | Repo files |
| --- | --- |
| StockStory Shell | src/app/AppShell.tsx, src/app/PublicLayout.tsx, src/components/MarketDashboard.tsx |
| StockStory Stock Detail | src/components/EnhancedStockDetails.tsx, src/components/stock/ |
| StockStory Scanner | src/components/AdvancedScanner.tsx, src/components/ScannerPresets.tsx, src/components/FilterBuilder.tsx |
| StockStory Rankings | src/explainability/RankingExplanationEngine.ts, src/components/dashboard/ |
| StockStory Compare | src/components/SimilarStocks.tsx |
| StockStory Watchlist | src/components/watchlist/ |
| StockStory Portfolio | src/components/PortfolioAnalyzer.tsx, src/components/portfolio/ |
| StockStory Sectors | src/components/SectorHeatmap.tsx, src/discovery/SectorRegistry.ts |
| StockStory Sector Detail | src/components/SectorHeatmap.tsx, src/discovery/SectorRegistry.ts |
| StockStory Alerts | src/components/alerts/, src/commercial/AlertSettings.tsx |
| StockStory Search | src/components/layout/, api/search.ts |
| StockStory Settings | src/commercial/BillingSettings.tsx, src/commercial/AlertPreferencesPanel.tsx |
| StockStory Pricing | src/commercial/plans.ts, src/commercial/SubscriptionCard.tsx |
| StockStory Sign In | src/context/AuthContext.tsx, src/config/firebase.ts |
| StockStory About | src/app/PublicLayout.tsx |
| StockStory Methodology | docs/ui/stockstory-design-system-manifesto.md |
