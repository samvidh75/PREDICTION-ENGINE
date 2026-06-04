# ACTIVE_MOCK_USAGE_REPORT.md

This report scans the entire `src/` tree for any import or reference containing the keywords **mock**, **fixture**, **sample**, **placeholder**, **fallback**, or **demo**.

## Findings

| File | Line(s) | Classification | Reason |
|------|---------|----------------|--------|
| `src/views/CommunityHub.jsx` | 7‑8, 77 | **Production Path** | The component uses a static `MOCK_COMMUNITY_DATA` array for rendering community activity. It is imported directly by the UI component and not guarded by any test flag.
| `src/styles/index.css` | 311, 361 | **Production Path** | CSS placeholder selectors (`::placeholder`) affect UI styling in production.
| `src/services/search/AdaptiveSearchMemoryEngine.ts` | 186 | **Production Path** | Contains a comment `// For now, return empty array as placeholder` and returns empty results, meaning the search feature currently produces no live data.
| `src/services/search/MultiLayerNavigationEcosystem.ts` | 77 | **Production Path** | Comment indicates a placeholder implementation.
| `src/services/telemetry/mockTelemetrySnapshot.ts` | 3‑19 | **Production Path** | Exports a mock telemetry snapshot that is used by various telemetry panels.
| `src/services/telemetry/MockTelemetryStream.ts` | 3‑15, 56 | **Production Path** | Implements a mock telemetry stream used throughout the telemetry system.
| `src/services/realtime/RealtimeStateManager.ts` | 13‑22, 33‑39, 65‑72 | **Production Path** | Contains mock interval management for realtime data streams.
| `src/services/news/NewsCoordinator.ts` | 15‑30 | **Production Path** | Defines a `MOCK_NEWS` array used to provide news items when no real provider is configured.
| `src/services/data/providers/HistoricalProvider.ts` | 8‑13 | **Production Path** | Implements `MockHistoricalProvider` with generated timeline points.
| `src/services/data/providers/MetadataProvider.ts` | 8‑17 | **Production Path** | Implements `MockMetadataProvider` returning static company details.
| `src/services/data/providers/NewsProvider.ts` | 16 | **Production Path** | Implements `MockNewsProvider` returning static news.
| `src/services/data/providers/PriceProvider.ts` | 8 | **Production Path** | Implements `MockPriceProvider` returning static quotes.
| `src/services/auth/firebase.ts` | 7‑12 | **Production Path** | Uses placeholder values for Firebase configuration when environment variables are missing.
| `src/pages/PortfolioPage.tsx` | 21‑22 | **Production Path** | Hard‑coded mock volatility and drawdown values.
| `src/pages/PracticeTerminalPage.tsx` | 775 | **Production Path** | Placeholder prompt text for editorial reflection.
| `src/pages/CommunityHubPage.tsx` | 70 | **Production Path** | Placeholder thread component used for UI mock.
| `src/pages/AssistantPage.tsx` | 290 | **Production Path** | Placeholder text in UI.

## Summary
- **Total mock/placeholder occurrences:** 24
- **Production paths** contain mock data directly used by UI components.
- **No test‑only files** were found; all occurrences are in production code.
- **Dead code**: None identified (all referenced files are imported).

**Action Required:** Replace the listed mock data sources with real provider‑backed implementations before proceeding.
