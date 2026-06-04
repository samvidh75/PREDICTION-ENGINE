# Performance Remediation Plan

This document details calculations, re-render constraints, and optimization plans for StockStory V3 layouts.

---

## 1. Identified Performance Risks

### Expensive Re-renders
* **Interactive Canvas Re-draws (`VOSChart.tsx`)**: Re-drawing the price chart is performed inside a `useEffect` listening to coordinate positions (`crosshairPos`). Since mouse moves change coordinates 60+ times per second, the entire canvas context scales and redraws.
  - *Optimization*: Separate crosshair indicators from the main historical curve canvas layer. Use absolute divs or a separate overlay canvas to render crosshair dashes to prevent redrawing the full price history on mouse moves.
* **Component-Level Re-renders (`DashboardHub.tsx`)**: The entire layout dashboard updates whenever the `useNavigation` path state changes.
  - *Optimization*: Memoize heavy dashboard widgets (`SectorExplorer`, `MarketExplorer`) using `React.memo` to avoid redundant component evaluations.

### Polling & Fetch Optimization
* **Redundant API Queries**: The Company Booklet page queries `/api/intelligence/market` and `/api/intelligence/portfolio` alongside company outlook details. These datasets can be cached globally in a React Context or React Query cache instead of re-fetching on every symbol transition.

---

## 2. Implementation Action Items
1. Move timeframe-specific historical price calculations to a background Web Worker if arrays exceed 1,000 points.
2. Implement memoized layout nodes for static widgets to isolate re-render loops.
