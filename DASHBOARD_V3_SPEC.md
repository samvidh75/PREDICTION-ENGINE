# StockStory Dashboard V3 Specification (Market Terminal Dashboard)

This document specifies the layout, components, interactive state models, and widget behaviors of the redesigned **Market Terminal Dashboard** (the default view for authenticated users).

---

## 1. Dashboard Structure & Sections

### Section 1: Institutional Header & Overview
* **Text Hierarchy**:
  * Greeting kicker: `text-[10px] tracking-widest font-mono text-cyan-400 uppercase` (e.g. "WELCOME SAMVIDH // SECURE CONNECTION 192.168.1.1")
  * Page Title: `text-3xl font-bold tracking-tight text-white` (e.g., "Market Terminal")
  * Macro Status Summary: A grid of 3 structural questions mapping what is happening, why, and what to watch.
* **Mobile Behavior**: Collapses the grid elements from 3 columns to 1 stacked list.

### Section 2: Personal Daily Brief Summary Widget
* **Layout**: A glassmorphic card stretching 100% width with a cyan-tinted accent boundary.
* **Widgets**:
  * **Market Mood Component**: Features an elegant, minimal icon (Sun/Cloud) with a bold colored label (Bullish, Bearish, Neutral) and a small sparkline reflecting intraday volatility.
  * **Portfolio Health Gauge**: Simple progress bars representing Factor Exposure percentages (Quality, Value, Growth).
  * **Active Signals Tracker**: List of the 3 most recent factor alerts with priority colors (Amber for warnings, Rose for critical updates).

### Section 3: Index Tracker Ribbon
* **Grid**: 3-column container (`NSE INDEX`, `BSE INDEX`, `SME INDEX`).
* **Content**: Name of index (e.g., "NIFTY 50"), absolute value (e.g., "22,453.80"), absolute delta, and percentage delta. Uses green (`#00D17A`) for positive, red (`#FF5B6E`) for negative. Font: JetBrains Mono.

### Section 4: What Deserves My Attention Today? (Core Insights)
* **Grid**: 5-column responsive row.
* **Component Widgets**:
  1. *Market Structure*: Metric representing percentage of Nifty stocks above 200 DMA.
  2. *Ownership changes*: institutional flows, FII changes.
  3. *Valuation shifts*: Sector P/E changes.
  4. *Earnings developments*: Aggregate margins and earnings reports.
  5. *Watchlist activity*: Blocks deals or tracking swings.
* **Constraint**: All copy inside these cards must be strictly analytical, under 40 words, explaining *what changed* and *why it matters* (e.g., "FII ownership in private banking rose 1.4% this quarter, suggesting returning foreign capital after valuation corrections, which could support price stabilization.").

### Section 5: Sector & Factor Explorers
* **Sector Rotation map**: Treemap or horizontal bar charts showing sector leadership shifts.
* **Opportunities Hub**: Multi-tab selector (Trending, High Quality, Dividend Swings, Factor Swings).

---

## 2. Interactive & State Handlers

### Loading States
* **Skeleton Overlay**: Displays dark grey translucent blocks with a pulse transition (`animate-pulse`) mirroring the exact size and boundary shapes of the terminal grid cards.

### Empty States
* **Personalized / Workspace Empty Tab**: If "My Workspace" has no recently viewed stocks or suggestions:
  * Render a central layout with a dotted cyan outline: "No tracked assets yet."
  * Prompt: "Search for a company to begin intelligence mapping."

### Mobile Behaviors
* Structural cards stack vertically.
* Sidebar elements disappear; secondary menu options migrate to the bottom navigation drawer (managed by `MobileNav`).
