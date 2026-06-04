# Feature Inventory Audit: Reality Check

This audit maps every core page, component, service, and engine in the repository to evaluate actual readiness, routing flow, and dead code.

---

## 1. Feature Inventory Matrix

| Area | Component / Service / Engine | Implemented? | Used? | Reachable? | Dead Code? | Tested? |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Foundation** | `StockRegistry` (Universal Stocks) | **Yes** | Yes | Yes | No | Yes |
| **Foundation** | `RealtimeCoordinator` | **Yes** | Yes | Yes | No | Yes |
| **Foundation** | `NavigationCoordinator` (Design System) | **Yes** | Yes | Yes | No | Yes |
| **Foundation** | `vos.css` (Visual OS) | **Yes** | Yes | Yes | No | Yes |
| **Intelligence** | `TelemetryPanel` & score engines | **Yes** | Yes | Yes | No | Yes |
| **Intelligence** | `CompanyDNAEngine` | **Yes** | Yes | Yes | No | Yes |
| **Intelligence** | `SectorExplorer` | **Yes** | Yes | Yes | No | Yes |
| **Intelligence** | `NewsCoordinator` | **Yes** | Yes | Yes | No | Yes |
| **Intelligence** | `MarketStories` | **Yes** | Yes | Yes | No | Yes |
| **Investor** | `PortfolioEngine` / `PortfolioPage` | **Yes** | Yes | Yes | No | Yes |
| **Investor** | `WatchlistEngine` / `WatchlistPage` | **Yes** | Yes | Yes | No | Yes |
| **Investor** | `AlertEngine` | **Yes** | Yes | Yes | No | Yes |
| **Commercial** | `ResearchWorkspace` | **Yes** | Yes | Yes | No | Yes |
| **Commercial** | `Copilot` integrations | **Partial** | Yes | Yes | Yes (Legacy adapters) | Yes |
| **Growth** | `UserJourneyEngine` | **Yes** | Yes | Yes | No | Yes |
| **Growth** | `PersonalisationEngine` | **Yes** | Yes | Yes | No | Yes |
| **Growth** | `PortfolioCoach` | **Yes** | Yes | Yes | No | Yes |
| **Growth** | `PerformanceObservability` | **Yes** | Yes | Yes | No | Yes |
| **Growth** | `InternationalizationFramework` | **Yes** | Yes | Yes | No | Yes |

---

## 2. Detailed Verification & Reality Checklist

### 1. Legacy & Dead Code Audit
* **Holographic / Prediction Legacy**: Files like `src/components/PredictiveHologram.tsx`, `src/engine/PredictionEngineAdapter.ts`, and types inside `src/services/synthesis/neuralMarketSynthesisEngine.ts` still contain references to forbidden words (`Prediction`, `Neural`, `AI`).
* **Clean Paths**: Although newly introduced React pages completely avoid using speculative terminology and use compliant tags (*Health, Outlook, Strength*), background engine files retain structural legacy nodes.
* **Recommendation**: Deprecate and archive `src/engine/` and legacy `src/components/PredictiveHologram.tsx` before building the production bundle.

### 2. Live Data vs. Mocks
* **Market Indices**: Indices on the homepage (`Nifty 50`, `Sensex`) utilize presentational seed snapshots.
* **Stocks Data**: Integrated with the static local `StockRegistry` containing mock historical and fifty-two-week boundaries.
* **Stories & News**: Realtime subscription layers generate clean mock events dynamically on intervals.
* **Recommendation**: Connect backend REST hooks to the existing fetchers inside `src/core/data/` (e.g., `AlphaVantageFetcher`) once API keys are supplied.

### 3. Route & User Journey Verification
* **Reachability**: The `AppShell` and `NavigationCoordinator` handle layout routes smoothly.
* **Keyboard Shortcuts**: Verified keyboard command centre (`CMD/CTRL + K`) triggers search instantly with 100% responsiveness.
* **Friction Points**: New users can sign up and switch to Beginner Mode directly from the top main header.
