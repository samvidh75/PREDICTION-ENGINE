# Feature Evidence Matrix

This matrix provides the exact file paths, component names, stores, hooks, and routes for every implemented investor feature.

---

## Code Evidence Matrix

| Feature | File Path | Component / Class | Store / Storage | Hook / API Route |
| :--- | :--- | :--- | :--- | :--- |
| **Watchlist Sync** | [watchlistStore.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/watchlistStore.ts) | `getWatchlist` / `addTickerToWatchlist` | `stockstory_watchlist_v1_${uid}` | `subscribeWatchlist` |
| **Watchlist UI** | [WatchlistPage.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/pages/WatchlistPage.tsx) | `WatchlistPage` | State-bound | Client-side render |
| **Custom Lists** | [WatchlistEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/WatchlistEngine.ts) | `WatchlistEngine` | Memory (`WatchlistEngine.watchlists`) | None |
| **Smart Lists** | [SmartWatchlistEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/SmartWatchlistEngine.ts) | `SmartWatchlistEngine` | In-memory evaluation | Pulls from `StockRegistry` |
| **Daily Briefing** | [TodayIntelligenceBrief.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/dashboard/TodayIntelligenceBrief.tsx) | `TodayIntelligenceBrief` | Cached response | `GET /api/intelligence/market` |
| **Factor Panels** | [FactorTransparencyPanel.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/company/FactorTransparencyPanel.tsx) | `FactorTransparencyPanel` | Loaded via props | Mounts in `CompanySuperpage.tsx` |
| **Score Reasons** | [ScoreExplanations.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/company/ScoreExplanations.tsx) | `ScoreExplanations` | Loaded via props | Mounts in `CompanySuperpage.tsx` |
| **Methodology UI**| [CompanyMethodologyAndRegistry.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/company/CompanyMethodologyAndRegistry.tsx) | `CompanyMethodologyAndRegistry` | Static registry | Mounts in `CompanySuperpage.tsx` |
| **Research Notes**| [NoteEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/NoteEngine.ts) | `NoteEngine` | Memory (`NoteEngine.notes`) | None |
| **Offline Cache** | [OfflineEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/OfflineEngine.ts) | `OfflineEngine` | `offline_cache_${symbol}` | None |
| **Alert Engine** | [AlertEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/AlertEngine.ts) | `AlertEngine` | Memory (`AlertEngine.alerts`) | None |
