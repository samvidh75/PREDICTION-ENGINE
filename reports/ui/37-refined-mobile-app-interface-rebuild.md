# Refined Mobile App Interface Rebuild

Date: 2026-06-18

## Rebuilt System

Implemented a reusable SSI mobile app layer with:

- `AppScreen`
- `AppTopBar`
- `AppBottomNav`
- `FloatingHelpButton`
- `ResearchHeroCard`
- `StockStoryCard`
- `MetricStoryCard`
- `CompanyTile`
- `SignalGroupSection`
- `HorizontalResearchRail`
- `DataSourcePill`
- `LiveFreshnessBadge`
- `ConfidenceMeter`
- `ScoreRing`
- `MiniSparklineCard`
- `PremiumSheet`
- `DarkGlassModal`
- `ResearchEmptyState`
- `WatchlistSearchCard`
- `PortfolioSummaryCard`
- `HoldingsTableMobile`
- `DetailAccordionCard`
- `SourceAuditCard`
- `StickyActionDock`
- `MobilePageHeader`
- `DesktopResearchGrid`

## Rebuilt Routes

- Home: app cockpit with source-backed metrics, signal changes, watchlist preview, and coverage snapshots.
- Watching: pinned research screen with search, local/remote list handling, notes, and empty state.
- Research Scanner: leaderboard data in scanner composition with mobile score cards and desktop table.
- Portfolio: practice holdings summary, manual cost-basis records, source audit, and mobile transformed holdings.
- Company: app detail wrapper with horizon selector and source audit around the evidence page.
- Trust Centre: app-native methodology and source-health screen with masked provider labels.

## Data Integrity

The interface continues to avoid:

- Fake AI recommendations.
- Fabricated stock cards.
- Fake user holdings or portfolio values.
- Buy/Sell/Trade actions.
- Fake Pro subscriptions or promotional modals.
- Provider secret/env variable exposure.

