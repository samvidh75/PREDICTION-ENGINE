# Final Architecture Freeze (StockStory India V3)

This document establishes the final architectural constraints, layout grids, components deletion checklist, and release schedule for the **V3 Product Experience Redesign**.

---

## SECTION 1 — FINAL SITE MAP

Below is the frozen list of production routes mapping directly to URL parameters.

| Clean URL Path | Query-Param Implementation | Component / Page Target | Access Type |
| :--- | :--- | :--- | :--- |
| `/` | `?page=landing` | `PublicLandingPage` | Public (Unauthenticated) |
| `/about` | `?page=about` | `PublicAboutPage` | Public (Unauthenticated) |
| `/login` | `?page=login` | `LoginPage` | Public (Unauthenticated) |
| `/signup` | `?page=signup` | `SignupPage` | Public (Unauthenticated) |
| `/dashboard` | `?page=dashboard` | `DashboardHub` | Protected (Authenticated) |
| `/discovery` | `?page=discovery` | `DiscoveryPage` | Protected (Authenticated) |
| `/stock/:symbol` | `?page=stock&id=SYMBOL` | `CompanySuperpage` | Protected (Authenticated) |
| `/watchlist` | `?page=watchlist` | `WatchlistPage` | Protected (Authenticated) |
| `/portfolio` | `?page=portfolio` | `PortfolioPage` | Protected (Authenticated) |
| `/alerts` | `?page=alerts` | `AlertCentrePage` | Protected (Authenticated) |
| `/settings` | `?page=settings` | `SettingsPage` | Protected (Authenticated) |

---

## SECTION 2 — DASHBOARD WIREFRAME

### Desktop Layout (Grid: 12-Column Grid Workspace)
```
+----------------------------------------------------------------------------+
| Header: Welcome Samvidh // Live Sync status              [Beginner: On/Off]|
+----------------------------------------------------------------------------+
| [ Daily Brief Widget: Market Mood | Portfolio Health | Active Alerts     ] |
+----------------------------------------------------------------------------+
| [ Nifty Index (4-Col) ]   | [ Sensex Index (4-Col) ]  | [ SME Index (4-Col) ] |
+----------------------------------------------------------------------------+
| Core Insights: What Deserves My Attention Today?                           |
| +------------------------------------------------------------------------+ |
| | Str. (1.5-Col) | Own. (1.5-Col) | Val. (1.5-Col) | Earn (2-C) | WL (2-C) | |
| +------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------+
| [ Sector Rotation Explorer (8-Col) ]     | [ Top Movers Sidebar (4-Col) ]  |
+----------------------------------------------------------------------------+
```

### Tablet Layout
```
+----------------------------------------------------------------------------+
| Header: Welcome Samvidh // Live Sync status                                |
+----------------------------------------------------------------------------+
| [ Daily Brief Widget: Mood & Health summary ]                              |
+----------------------------------------------------------------------------+
| [ Indexes Stack: Nifty (12-Col) | Sensex (12-Col) | SME (12-Col) ]         |
+----------------------------------------------------------------------------+
| Core Insights: Attention Cards (Grid: 2x2 + 1)                             |
+----------------------------------------------------------------------------+
| [ Sector Rotation Explorer (12-Col) ]                                      |
+----------------------------------------------------------------------------+
```

### Mobile Layout
```
+------------------------------------+
| Mobile Header               [Menu] |
+------------------------------------+
| Daily Brief Summary                |
+------------------------------------+
| Core Index Metrics                 |
+------------------------------------+
| 5 Attention Insights (Swipe List)  |
+------------------------------------+
| Quick Sector Highlights            |
+------------------------------------+
| [Home] [Discover] [Port] [Alerts]  | (Mobile Navigation Rail)
+------------------------------------+
```

---

## SECTION 3 — COMPANY PAGE WIREFRAME

### Section Order (Strictly Enforced)

```
+----------------------------------------------------------------------------+
| Section 1: Hero Block (Symbol Ticker, Name, Price, Live Active Badge)      |
+----------------------------------------------------------------------------+
| Section 2: Corporate DNA Grid (Business Quality, Growth, Risk, Sentiment)  |
+----------------------------------------------------------------------------+
| Section 3: Telemetry Charts (Stock Price overlay with factor spikes)       |
+----------------------------------------------------------------------------+
| Section 4: Performance Channels & Ranges (52-Week high/low visual slider)   |
+----------------------------------------------------------------------------+
| Section 5: Narrative Documentary (Reading Booklet: Business summary)       |
+----------------------------------------------------------------------------+
| Section 6: Key Financial Metrics & Broker Outbounds                        |
+----------------------------------------------------------------------------+
```

---

## SECTION 4 — COMPONENT DELETION LIST

| File Path | Status | Action / Reason |
| :--- | :--- | :--- |
| `src/views/MarketStories.tsx` | **DELETE** | Standalone Stories feed has been replaced by Discovery redirects. |
| `src/views/MarketStories.jsx` | **DELETE** | Legacy JavaScript copy. |
| `src/views/DashboardHub.jsx` | **DELETE** | Legacy JavaScript copy. |
| `src/views/CompanySuperpage.jsx` | **DELETE** | Legacy JavaScript copy. |
| `src/views/LandingHero.jsx` | **DELETE** | Legacy JavaScript copy. |
| `src/views/CommunityHub.jsx` | **DELETE** | Legacy JavaScript copy. |
| `src/views/PracticeTerminal.jsx` | **DELETE** | Legacy JavaScript copy. |
| `src/pages/DailyBriefPage.tsx` | **DELETE** | Standing page deleted (already executed in simplification phase). |

---

## SECTION 5 — IMPLEMENTATION ORDER

### Phase 1: Cleanup & Base Styling Alignment
* **Files Modified**: `src/components/navigation/Sidebar.tsx`, `src/components/navigation/MobileNav.tsx`
* **Task**: Perform physical file deletion of items marked `DELETE` in Section 4. Ensure tailwind configurations match exact hex parameters in `STOCKSTORY_DESIGN_SYSTEM_V3.md`.

### Phase 2: Secure Pages Redeployment
* **Files Modified**: `src/pages/LoginPage.tsx`, `src/pages/SignupPage.tsx`, `src/App.tsx`
* **Task**: Redesign standalone Login and Signup views to adopt the V3 design system guidelines.

### Phase 3: Dashboard V3 Layout Grid
* **Files Modified**: `src/views/DashboardHub.tsx`, `src/components/dashboard/DailyBriefWidget.tsx`
* **Task**: Build the V3 dashboard grid structure aligning Daily Brief summaries, indices, and 40-word insight cards.

### Phase 4: Company booklet page V3
* **Files Modified**: `src/views/CompanySuperpage.tsx`
* **Task**: Build the V3 Company details booklet structure matching the order defined in Section 3.

---

## SECTION 6 — RISK ANALYSIS

1. **Navigation Regressions**: Sync offsets between browser events (`popstate`) and `LayoutContext` could cause view mismatches.
   - *Mitigation*: Derive all path components strictly from `window.location.search` parameters.
2. **Auth Regressions**: Dedicated `/login` and `/signup` paths must check auth states on mount to prevent infinite redirect loops.
   - *Mitigation*: Wrap landing routes in explicit auth checks so logged-in users are automatically routed to `page=dashboard`.
3. **Responsive Layouts**: Desktop sidebars occupy 260px; tablet grids must cleanly adapt to 100% width.
   - *Mitigation*: Enforce absolute breakpoint rules (`hidden md:flex`, `grid grid-cols-1 lg:grid-cols-12`).

---

## SECTION 7 — GO / NO GO

### Ready for V3 Implementation: **GO**
The routing structure is clean, TypeScript compiling is functional, dual-routing conflicts are resolved, and design constraints are clearly specified. The project is ready for V3 implementation.
