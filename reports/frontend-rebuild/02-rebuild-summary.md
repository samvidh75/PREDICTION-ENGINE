# Frontend Rebuild Summary

This document summarizes the changes made to the **StockStory India** frontend to replace neon, cyberpunk, and gimmicky themes with a high-contrast, clean, professional research workspace style.

## 1. Professional UI Primitives Created
We implemented a set of minimal, clean, slate-based UI primitives in `src/components/ui/`:
- **Button.tsx**: Clean styles (slate/zinc neutral-dark, solid/outline/ghost variants).
- **Card.tsx**: Standard containers with minimal border and card properties.
- **Input.tsx**: Clean text input with validation support.
- **Table.tsx**: Bordered grid rows and headers for finance data tables.
- **Badge.tsx**: Flat badges for sector labels and status flags.
- **EmptyState.tsx**: Clean placeholder for empty states/missing data.
- **ScorePill.tsx**: Flat status-colored pills indicating factor scores.

## 2. Rebuilt Pages & Modules
- **Public Landing Page** (`src/pages/PublicLandingPage.tsx`): Focuses on the core message "Indian equity research, made readable" with clear CTAs, trust signals, and a prominent research disclaimer.
- **Authentication Pages** (`src/pages/LoginPage.tsx` / `src/pages/SignupPage.tsx`): Card centered layouts with session auto-redirect disabled (`restoreOnMount={false}`) to ensure clean explicit auth.
- **App Layout Shell** (`src/components/navigation/AppLayout.tsx`): Removed neon styling, decorative charts, and ambient text overrides. Displays a clean central workspace.
- **Navigation** (`src/components/navigation/Sidebar.tsx` / `src/components/navigation/MobileNav.tsx`): Simplified to only the 6 core links requested: Dashboard, Search, Rankings, Watchlist, Methodology, and Settings.
- **Search Page** (`src/pages/SearchPage.tsx`): Upgraded to use new clean card structures, badges, and empty state fallbacks.
- **Rankings Page** (`src/pages/PublicRankingsPage.tsx`): Restructured into a clean table-first view with client-side searching and sector-filtering.
- **Watchlist Page** (`src/pages/WatchlistPage.tsx`): Rewritten to list monitored tickers in a clean, professional grid, supporting quick inline note saving.
- **Settings Page** (`src/pages/SettingsPage.tsx`): Tabbed settings workspace for profile information, notifications, and reset controls using new primitives.
- **Trust & Methodology** (`src/pages/TrustCentrePage.tsx`): Replaced neon/neobrutalist boxes with standard professional cards detailing Growth, Quality, Valuation, Stability/Risk, and Momentum scoring engines.

## 3. Preserved Architecture & Backend
- **Backend scoring engines** (`FactorEngine`, `FeatureEngine`) are entirely untouched.
- **Database schemas and adapters** (`SQLiteAdapter`, Postgres adapters) are untouched.
- **Data ingestion pipelines** (`yfinance` bridges, ingestion scripts) are untouched.
- **API contracts** and response envelopes are preserved.
- **Firebase auth service** was retained.
