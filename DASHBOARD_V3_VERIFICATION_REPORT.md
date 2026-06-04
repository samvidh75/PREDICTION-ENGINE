# Dashboard V3 Verification Report

This report presents verification evidence, component hierarchies, layouts, data lineage mapping, and empty-state resilience confirmations for the **redesigned Market Terminal Dashboard (V3)**.

---

## 1. Component Hierarchy

```
DashboardHub
├─ Header & Title Panel (Local inline node)
├─ Search Form (Local inline form)
├─ Market Pulse Grid (Layout Wrapper)
│  ├─ SectorExplorer (Heatmap component)
│  └─ Benchmark Indices Sidebar
│     └─ MarketIndexCard (Nifty 50, Sensex Cards)
├─ Watchlist Grid (Layout Wrapper)
│  ├─ Top Movers (Watchlist List)
│  ├─ Score Changes (Watchlist List)
│  └─ Ownership Shifts (Factor summary)
├─ Discovery Opportunities
│  └─ MarketExplorer (Thematic Opportunities Grid)
├─ Alerts Panel (Grid & filter)
└─ Recent Activity Panel
   ├─ Saved Research List (Investor Memory)
   └─ Watchlist Updates List (Investor Memory)
```

---

## 2. Exact Layout & Widgets Rendered
* **Top Bar Header**: User greeting customized via `PersonalisationEngine` + active Search bar form capturing queries to open search overlay.
* **Sector Heatmap Widget**: Responsive block displaying sector capitalization swings.
* **Daily Flows Widget**: Metric cards representing Breadth, FII net flows, DII net flows, and India VIX volatility index.
* **Benchmark Ribbon**: Display of core market indicators (Nifty 50, Sensex).
* **My Watchlist Grid**: Three modular columns tracking price delta lists, factor score changes, and mf accumulation highlights.
* **Opportunities Grid**: Comprehensive factor scan categories (Quality, Growth, Momentum, Value).
* **Alerts Row**: High-priority factor warnings.
* **Recent Activity Grid**: Double column mapping saved company bookmarks and tracking timeline.

---

## 3. Desktop vs. Mobile Layouts

### Desktop Layout (12-Column Grid)
* **Market Pulse**: Takes up 8 columns for the Sector Heatmap and metrics, 4 columns for the Benchmark indices sidebar.
* **Watchlist**: Renders in 3 columns (`grid grid-cols-1 md:grid-cols-3`).
* **Opportunities & Alerts**: Takes up 100% width grid sheets.
* **Activity**: Renders in 2 columns.

### Mobile Layout (Single Column Stack)
* Structural elements collapse to a single column block (`grid grid-cols-1`).
* Indices stack vertically.
* The desktop sidebar is hidden, migrating actions to the bottom navigation rail (`MobileNav`).

---

## 4. Lineage of Dashboard Data Sources

| Feature Section | Data Provider / Service | Data Nature | Classification |
| :--- | :--- | :--- | :--- |
| **Market Index Cards** | `getMarketIntelligence` / API endpoint | Real-time market metrics | **LIVE** |
| **Heatmap & Opportunities**| `getDiscoveryIndex` / `MarketExplorer` | Curated stock lists and metrics | **STATIC** / **LIVE** |
| **My Watchlist** | `getWatchlists` / `watchlistStore` | User watchlist storage | **PERSISTED** |
| **Alerts Feed** | `AlertEngine.getAlerts()` | System notifications ledger | **PERSISTED** |
| **Recent Activity** | `InvestorMemoryEngine.getMemory()` | Local storage history | **PERSISTED** |

---

## 5. Verification of Empty-State Behaviors

The V3 dashboard has been tested and verified to remain fully responsive and error-free when loading clean, empty user profiles:

1. **Dashboard with an Empty Account**:
   - *Behavior*: Greetings default safely to general welcome kickers. Benchmark indices, Daily brief summary cards, and Sector maps render correctly.
2. **Dashboard with No Watchlist**:
   - *Behavior*: Displays a clean fallback message inside the card: `"No watched symbols."`
3. **Dashboard with No Alerts**:
   - *Behavior*: Renders a centered empty alert panel stating: `"No pending factor alerts"` (no error states or empty list layout cracks).
4. **Dashboard with No Saved Research**:
   - *Behavior*: Displays secondary empty state descriptions: `"No saved booklet research."` and `"No recent updates."`
