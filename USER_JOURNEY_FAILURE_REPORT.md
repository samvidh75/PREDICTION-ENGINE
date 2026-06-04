# User Journey Failure Report

This report documents current friction points, navigation bugs, and design inconsistencies in the StockStory user experience.

## Critical Journey Failures

### 1. The "Initialize Session" Dead-End
* **Observed Failure:** Clicking the main Call-to-Action ("Initialize Session") triggers a modal or silent refresh but lacks clear pathing to standard signup or login pages. If the user is unauthenticated, they hit a screen that feels like a technical terminal instead of a premium service entry point.
* **Impact:** High bounce rates; users fail to register or log in due to onboarding blocking or missing `/login` and `/signup` paths.

### 2. Multi-Step Onboarding Friction
* **Observed Failure:** The app forces users through multiple setup screens before displaying any data. It asks questions about:
  - Sector preferences
  - Personality/style indicators
  - Investing horizons
  - Analytical depth
* **Impact:** Immediate drop-off. Professional investors want to see the product value (what deserves attention, company summaries) immediately, not answer questionnaires.

### 3. Disconnected Router & Navigation System
* **Observed Failure:** The navigation system is split between browser URL state changes (`?page=...` query parameters in `App.tsx`) and context state view changes (`currentView` in `LayoutContext.tsx`).
* **Impact:** Reloading the browser or using back/forward buttons breaks page states, leading to erratic sidebar routing and view mismatches.

### 4. Raw Developer Terminology Exposed to Investors
* **Observed Failure:** The interface clutters the UI with developer/data-science terms. Examples:
  - "Calibration phase active"
  - "Telemetry node status: SECURE"
  - "Factor pipeline initialization"
  - "Neural confidence scores"
* **Impact:** Looks like a science-fiction demo or a gaming site rather than a professional SEBI-compliant equity intelligence application.

### 5. High-Maintenance, Low-Value Features
* **Observed Failure:** Features like the **Community Hub** (empty forum threads), **Practice Terminal** (simplistic paper trading), and **AI Assistant** (generic chat window) distract from StockStory's core strength: transforming data into company intelligence.
* **Impact:** Dilutes product quality; increases maintenance overhead without adding value.
