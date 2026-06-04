# Authentication UX Cleanup Report

This report documents the occurrence of legacy terms ("cinematic", "telemetry", "calibration", "hologram", "neural", "institutional node") identified within the project codebase.

---

## 1. Occurrences of Legacy Terms

### Term: `hologram` / `holographic`
* **`src/engine/utils/HolographicOverlay.tsx`**: Renders holographic UI lines. (Should be deleted or refactored).
* **`src/components/PredictiveHologram.tsx`**: Predictive asset charts. (Should be renamed or removed).
* **`src/components/telemetry/HolographicTelemetryEngine.tsx`**: Found in page layouts.

### Term: `telemetry`
* **`src/services/telemetry/useCompanyTelemetry.ts`**: Contains data normalization rules.
* **`src/components/telemetry/TelemetryPanel.tsx`**: Used in Company details views.
* **`src/systems/telemetry/telemetryRules.ts`**: Verification guidelines.

### Term: `calibration`
* Found in legacy design guides and verification checklists (`MOCK_ERADICATION_AUDIT.md`, `CALIBRATION_REPORT.md`). 

### Term: `neural`
* **`src/components/synthesis/NeuralMarketSynthesisPanel.tsx`**: Component for synthesis analysis.
* **`src/services/synthesis/useNeuralMarketSynthesisSuperengine.ts`**: Synthesis service wrapper.

### Term: `institutional node` / `node`
* **`src/App.tsx`**: Mock user ID references (`"usr_256_sec_node"`).
* **`src/pages/PublicLandingPage.tsx`**: Headline / header kickers referencing secure active nodes.

---

## 2. Recommended Action Plan
* **Authentication Views**: Remove any kickers mentioning `"SECURE_DATA_NODE"` or `"RESTORE_SECURE_NODE"` and replace with clean, institutional text like `"Account Authentication"` or `"Session verification"`.
* **Subsystem Refactoring**: During subsequent redesign phases, rename `TelemetryPanel` and `HolographicTelemetryEngine` to `PerformanceMetricsPanel` and `MetricsSummaryTable` to align with the Notion/Bloomberg design standard.
