# Snapshot Usage Report

## 1. Detection Verdict
The file [clientIntelligenceProvider.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/intelligence/clientIntelligenceProvider.ts) reads from a **hardcoded object** (`staticIntelligenceData`) defined directly inside the file body.

## 2. Derivation Context
The hardcoded object is a TypeScript-compliant layout of the pre-computed snapshots created by the offline validation run in [run-intelligence-validation.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/scripts/run-intelligence-validation.ts), which were written to `reports/INTELLIGENCE_VALIDATION_REPORT.json`.

## 3. Runtime Characteristics
- **Dynamic Connection**: No active database connection or live REST API connection is used at runtime.
- **Cache Status**: The data is loaded into memory instantly when the ES6 module is imported by Vite in the browser.
- **Execution Mode**: Offline-computed batch mode.
