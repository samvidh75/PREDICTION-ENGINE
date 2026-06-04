# Company Page Master Specification

The Company Intelligence page (`/stock/:symbol`) is the flagship experience of StockStory India. It replaces data dumps and gaming telemetry interfaces with structured, analyst-grade equity intelligence.

## Page Layout & Hierarchy

The page is structured as a vertical scrolling dashboard:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [Hero] Reliance Industries (RELIANCE)  │  Price: ₹2,984 (+1.8%)       │
├────────────────────────────────────────────────────────────────────────┤
│  [AI Summary] Analyst Executive Briefing (Max 150 words)               │
├────────────────────────────────────────────────────────────────────────┤
│  [Factor Diagnostics]                                                  │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌──────────────┐  │
│  │ Quality Score: 83/100 │ │ Valuation: Fair Value │ │ Ownership: ▲ │  │
│  └───────────────────────┘ └───────────────────────┘ └──────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│  [Financial Story] Historical margins, revenue CAGR, debt parameters.  │
├────────────────────────────────────────────────────────────────────────┤
│  [Ownership Trends] Detailed FII & DII quarterly allocations.         │
├────────────────────────────────────────────────────────────────────────┤
│  [Valuation Context] Current P/E vs. 5-year historical average bounds. │
├────────────────────────────────────────────────────────────────────────┤
│  [Risk Factors] & [Catalysts] & [Corporate Timeline]                   │
└────────────────────────────────────────────────────────────────────────┘
```

## Section Details

### 1. Hero Header
* **Details:** Company Name, Ticker, Exchange (NSE/BSE), Price, Day Change (%), and a subtle SEBI compliance badge ("Non-discretionary equity intelligence; not financial advice").

### 2. Analyst Summary (AI Summary)
* **Details:** Max 150-word, high-fidelity briefing written in professional research tone (no predictions, buy/sell recommendations, or sensational language).
* **Format:**
  - What happened?
  - Why does it matter?
  - What should investors watch?

### 3. Factor Diagnostics & Quality Score
* **Details:** Visual gauge showing the composite Quality Score (e.g. 83/100) derived from ROE, ROCE, leverage, and cash flow conversion metrics.

### 4. Financial Story
* **Details:** A clean, data-dense table and line chart showcasing Revenue growth, EBITDA margins, and Net Profit trends over the last 5 years.

### 5. Ownership Trends
* **Details:** A bar chart illustrating the shareholding structure breakdown (FII, DII, Promoter, Public) and changes over the last 4 quarters.

### 6. Valuation Context
* **Details:** Graphical representation mapping current trailing P/E and EV/EBITDA ratios against their historical 5-year average bounds, clearly showing if the asset is compressed or premium priced.

### 7. Risk Factors, Catalysts, and Timeline
* **Details:** Bulleted layout of structural headwinds (e.g., raw material costs) and growth catalysts (e.g., capex expansion), followed by an interactive timeline of corporate announcements.
