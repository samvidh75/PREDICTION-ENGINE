# Legacy Language Purge Plan

This document outlines the strategy to systematically eliminate legacy terminology ("telemetry", "neural", "calibration", "hologram", "institutional node", "ecosystem", "pipeline") from user-facing screens and internal modules.

---

## 1. Identified Terms & Replacement Strategy

| Term | Target Location (Files) | Replacement Term | Purpose |
| :--- | :--- | :--- | :--- |
| **`telemetry`** | `src/types/stock.ts`, `src/views/CompanySuperpage.tsx` | `PerformanceMetrics` / `BookletData` | Avoid sci-fi tone; focus on fundamental financial metrics. |
| **`neural`** | `src/components/synthesis/NeuralMarketSynthesisPanel.tsx` | `MarketSynthesis` / `InsightSummary` | Remove AI hype and buzzwords. |
| **`calibration`** | Design logs and verification checklists | `Verification` / `Refinement` | Focus on institutional auditing. |
| **`hologram`** | `src/engine/utils/HolographicOverlay.tsx` | `MetricsOverlay` / `GraphOverlay` | Strip out futuristic holographic effects. |
| **`institutional node`**| `src/App.tsx`, `src/pages/PublicLandingPage.tsx` | `Auth Node` / `Data Sync` | Standardize on enterprise database sync language. |
| **`ecosystem`** | Sidebar & navigation labels | `Market Sectors` / `Theme Groups` | Use clear, standard investment terminology. |
| **`pipeline`** | System models and guides | `Flow` / `Data Sync Route` | Standardize developer-facing guides. |

---

## 2. Execution steps
* **Rename Components**: Rename components like `HolographicTelemetryEngine` to `PerformanceMetricsPanel` and delete files containing purely legacy overlays.
* **Update user-facing copy**: Refactor titles and kickers to use standard financial terms (e.g. replacing "Secure Node Live" with "Active connection").
