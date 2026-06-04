# RC40 - Workflow First UX Rebuild Audit

This document outlines the user workflow audits and structural plans to shift StockStory India from a collection of widgets into a unified, step-by-step research platform.

---

## Redesign Outline

| Phase | Component/Page | Current Violation | Fix Action Plan |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Dashboard** | Overwhelms users with duplicate index charts and scattered metrics. | Replace with 4 standard sections: Today's Opportunities (5 cards with Open Analysis triggers), Watchlist Updates, Recent Research, and Compact Market Snapshot. |
| **Phase 2** | **Company Page** | Multi-page report style layout requires excessive scrolling. | Render as an executive briefing: Hero (Name, Ticker, Price, Quality Score), Briefing block (What happened, Why it matters, What to watch), and clean horizontal tabs. |
| **Phase 3** | **Discovery** | Massive flat grid layout feels like a raw database. | Group into 5 workflow categories: High Quality, High Growth, Value Opportunities, Momentum, and Turnarounds. Max 10 companies per category, no infinite grid. |
| **Phase 4** | **Search** | Screen takeover with unnecessary overlays. | Limit search modal to 700px width with instant input focus, auto-close on select/escape, and list Ticker, Name, Sector, Score. |
| **Phase 5** | **Watchlist** | Static table columns. | Include a user-input field note: "Why are you watching this company?" and persist the custom notes across reloads. |
| **Phase 6** | **Portfolio** | Lack of actionable priorities. | Add a workflow header: Portfolio Value, Day Change, Biggest Winner, Biggest Loser. Display inventory table below. |
| **Phase 7** | **Alerts** | Hardcoded alerts logs. | Standardize every alert card to contain: What happened, Why it matters, Suggested action (max 80 words). |
| **Phase 8** | **Navigation** | Extra menu links (Scanner, Focus, Explorer, etc.). | Simplify sidebar links to: Home, Search, Discovery, Watchlist, Portfolio, Alerts, Settings. |
| **Phase 9** | **Content Cleanup** | Placeholder commentaries. | Clean up all dummy narratives and replace with concise, real-data representations. |
