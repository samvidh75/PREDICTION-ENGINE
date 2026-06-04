# STOCKSTORY INDIA V4 UX AUDIT

This audit identifies design violations and architectural inconsistencies across all StockStory India pages, detailing the precise fixes aligned with the V4 design specifications.

---

## Global UX Issues

| Page/Component | Problem Identification | Fix Specification |
| :--- | :--- | :--- |
| **Global Layout & Navigation** | Multiple duplicate navigation structures, floating rails, inconsistent margins, and overlapping screens. | Implement a unified 240px wide sidebar containing ONLY: Home, Search, Watchlist, Portfolio, Alerts, Settings. Align main content to a clean, center-aligned 1600px grid. |
| **Top Header** | Large browser-like container with floating search overlay and duplicate layout tags. | Create a standardized desktop top header with: Search (48px tall, max-width 600px), Notifications button, and Profile dropdown. |
| **Jargon & Cyberpunk Vibe** | Heavy use of "telemetry", "neural", "hologram", "calibration", "node", "transmission" etc. | Strip all sci-fi/telepunk terminology. Replace with clear, premium business alternatives: Research, Insights, Quality, Market, Company, Portfolio, Watchlist, Alerts. |
| **Typography & Spacing** | Non-standard spacing and low-contrast labels. Extra scrollbars on desktop before content is shown. | Establish strict spacing values (8, 16, 24, 32, 48, 64 only). Set text-contrast minimum to 4.5 and interactive targets to 44px minimum. |

---

## Page-by-Page Audit

### 1. Landing / Public Pages
* **Problem**: Apple-style styling blended with cyberpunk elements and terminal-like descriptions.
* **Fix**: Clean up all text references, use standardized buttons with 44px interactive height, and apply the pure premium dark glass system.

### 2. Dashboard (Home)
* **Problem**: Information overload, wrong greeting times (ignores actual local clock), nested non-responsive cards, and custom top movers list.
* **Fix**: 
  - Section 1: Greeting using actual local system hour.
  - Section 2: Four-card Market Snapshot (Nifty 50, Sensex, Nifty Bank, India Vix) capped at 40 words each.
  - Section 3: "What Deserves My Attention" with 5 high-contrast actionable cards (Ticker, metric change, why it matters).
  - Section 4: Clean Top Movers table (Ticker, Price, Change).
  - Section 5: Watchlist Summary list containing exactly 5 holdings and a "View All" redirection button.

### 3. Search Experience
* **Problem**: Oversized screen takeover that requires escape buttons.
* **Fix**: Constrain search modal to 700px width. Support `Ctrl+K` / `Cmd+K` / Search button to trigger. Auto-close search on escape key or when clicking a result. Direct results to `?page=stock&id=SYMBOL`.

### 4. Company Page
* **Problem**: Excessive booklet format with infinite scroll sections.
* **Fix**: Clean Hero showing Ticker, Name, Sector, Price, and Quality Score. Switch sections to an interactive tab system (Overview, Financials, Valuation, Ownership, Risks). Limit Overview text summary to under 150 words.

### 5. Watchlist
* **Problem**: Card wall layout.
* **Fix**: Convert into a structured table showing: Ticker, Price, Change, Quality Score, Reason Being Watched. Make rows clickable.

### 6. Portfolio
* **Problem**: Cluttered layout with nested cards.
* **Fix**: Simple top statistics bar showing Portfolio Value, Day Change, Total Return. Display holding inventory as a structured table (Ticker, Allocation, Value, Return).

### 7. Alerts
* **Problem**: Raw telemetry text.
* **Fix**: Standardize alert list items showing: What happened, Why it matters, and Suggested action (max 80 words).

### 8. Settings
* **Problem**: Extra developer settings and debug screens.
* **Fix**: Limit settings menu to: Profile, Notifications, Security, and Appearance.
