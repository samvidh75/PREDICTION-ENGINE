# Dashboard Redesign Specification

The redesigned Dashboard (`/dashboard`) acts as the user's primary command terminal. It answers the fundamental question: **"What deserves my attention today?"** using a clean, information-dense, and professional grid.

## Wireframe Layout Grid

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo] StockStory India            [Global Search: Ticker / Name]   (User) │
├─────────────────────────────────────────────────────────────────────────────┤
│  Market Pulse:  Nifty 50: 22,453 (+0.6%)  │  Sensex: 73,872 (+0.7%)         │
├─────────────────────────────────────────────────────────────────────────────┤
│  WHAT DESERVES MY ATTENTION TODAY?                                          │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────┐  │
│  │ Market Structure      │ │ Ownership Changes     │ │ Valuation Shifts  │  │
│  │ Insight < 40 words    │ │ Insight < 40 words    │ │ Insight < 40 words│  │
│  └───────────────────────┘ └───────────────────────┘ └───────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐ ┌─────────────────────────────┐  │
│  │ Watchlist Activity                     │ │ Recent Alerts               │  │
│  │ 1. TCS       88/100  Fair Value  FII▲  │ │ - HAL block deal (0.6% eq)  │  │
│  │ 2. RELIANCE  83/100  Undervalued DII▲  │ │ - TCS margin expansion      │  │
│  └────────────────────────────────────────┘ └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Discovery Feed (Trending & Opportunities)                              │  │
│  │ TATAMOTORS (Trending) │ HDFCBANK (Improving Ownership) │ COALINDIA (Val)│  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Required Dashboard Widgets

### 1. Global Search
* **Design:** Sleek search input box in the header, supporting auto-complete lookup for NSE and BSE company names or symbols. Selecting a stock navigates immediately to `/stock/:id`.

### 2. Market Pulse
* **Design:** Horizontal strip showing Nifty 50, Sensex, and SME indexes with real-time indicators.

### 3. "What Deserves My Attention Today?" (Attention Widgets)
* **Design:** 5 grid cells (Market Structure, Ownership Changes, Valuation Shifts, Earnings Developments, Watchlist Activity) displaying concise, 40-word summaries clarifying exactly *what changed* and *why it matters*.

### 4. Watchlist Snapshot
* **Design:** Table or card list of watched tickers displaying company name, quality score, valuation status, ownership trend, and a "Research" action.

### 5. Alerts Panel
* **Design:** Feed of the latest system alerts showing recent block deals, margin expansions, and capital changes.

---

## Removed Elements
* **Removed:** Legacy onboarding greeting headers ("Good morning, Balanced Allocator").
* **Removed:** Onboarding setup flows or style customization widgets.
* **Removed:** Empty developer placeholders and raw sci-fi console logs.
