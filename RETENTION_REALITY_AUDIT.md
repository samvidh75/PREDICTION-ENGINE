# Retention Reality Audit

This audit evaluates the implemented features that drive daily, weekly, or monthly user engagement.

---

## Verified Retention Hooks

The following engagement features are active in the codebase:

### 1. Daily Engagement Hook: Live Daily Briefing
* **Component**: [TodayIntelligenceBrief.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/dashboard/TodayIntelligenceBrief.tsx)
* **Wired Endpoint**: `/api/intelligence/market`
* **Trigger**: Users return to review the dynamic market mood index, risk parameters, and plain-English narrative summary of the current market state.

### 2. Weekly Engagement Hook: Smart Watchlists & Discovery
* **Component**: [WatchlistPage.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/pages/WatchlistPage.tsx)
* **Service**: [SmartWatchlistEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/SmartWatchlistEngine.ts)
* **Trigger**: Smart watchlists dynamically calculate momentum leaders, improving stocks, and turnarounds based on weekly range checks, giving users fresh ideas for weekly watchlist reviews.

### 3. Monthly Engagement Hook: Portfolio Intelligence & Risk Hotspots
* **Component**: [CompanySuperpage.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/company/CompanySuperpage.tsx) / [PortfolioPage.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/pages/PortfolioPage.tsx)
* **Trigger**: Users review and balance their holdings based on concentration warnings and factor drift tracking.
