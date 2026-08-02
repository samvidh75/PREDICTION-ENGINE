# Route Layer Guide

This folder now separates route ownership by product or system area instead of keeping large mixed handlers in one file.

## Core Modules

- `registerFeatureRoutes.ts`
  Registers repo-native feature APIs that were added during the cleanup pass.
- `registerCommercialRoutes.ts`
  Registers commercial and monetization-adjacent route bundles.
- `health.ts`
  Health and readiness probes.

## Intelligence

- `intelligenceCoreRoutes.ts`
  Financial, technical, risk, and RAG intelligence endpoints.
- `intelligenceMarketRoutes.ts`
  Earnings and event/catalyst intelligence endpoints.
- `intelligenceContextRoutes.ts`
  Valuation, news, and sector context endpoints.
- `earningsSentimentRoutes.ts`
  Derived earnings calendar plus normalized sentiment summary endpoints.

## Product Surfaces

- `personalResearchRoutes.ts`
  Personal Research OS routes: profile, alerts, digest, presets, actions, thesis history, watchlist intelligence, notifications.
- `portfolioOptimization.ts`
  Portfolio optimization and stress testing.
- `unifiedAlertsRoutes.ts`
  Alert rule creation, listing, and evaluation.
- `backtestRoutes.ts`
  Backtest run and walk-forward endpoints.
- `research.ts`
  Research snapshot and scanner routes.

## Public / Utility

- `publicEngagementRoutes.ts`
  Waitlist and feedback submission.
- `liveQuotes.ts`
  Legacy web route wrapper for quotes websocket registration.
- `brokerAuth.ts`
  Broker login and callback routes.

## Usage Pattern

Prefer adding new route modules here and registering them through a narrow registrar rather than expanding `src/render/apiRouter.ts` or `src/render/startServer.ts` inline.
