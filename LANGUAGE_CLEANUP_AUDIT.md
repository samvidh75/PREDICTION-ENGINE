# Language Cleanup Audit

This document identifies occurrences of forbidden cyberpunk jargon, AI buzzwords, and data-science filler terms in user-facing components, providing replacement recommendations.

## Main Vocabulary Replacements

| Forbidden Term | Recommended Replacement | Rationale |
| :--- | :--- | :--- |
| `telemetry` | `metrics` / `indicators` / `diagnostics` | Use standard financial term. |
| `calibration` | `experience` / `setup` / `mode` | Simplifies UI onboarding context. |
| `ecosystem` | `market` / `sector` / `group` | Removes startup/tech cliché. |
| `pipeline` | `engine` / `process` / `model` | Clutters user's understanding of calculations. |
| `institutional node` | `institutional flows` / `funds` | Avoids networking jargon. |
| `signal amplification` | `trend strength` | Removes fake tech styling. |
| `confidence pulse` | `signal status` | Removes gamer term. |
| `quantum` | `quantitative` | More accurate and professional. |
| `neural` | `analytical` | Removes generic AI buzzwords. |
| `market setup` | `market indicators` | Clearer financial translation. |
| `intelligence layer` | `analysis` / `summary` | Direct and simple. |

---

## File-Specific Replacements (Key Components)

### 1. Company Page UI & Logic
* **File:** [CompanySuperpage.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/views/CompanySuperpage.tsx)
  - **Line 3:** `import { useCompanyTelemetry } from "../services/telemetry/useCompanyTelemetry";`
    - *Replacement:* `import { useCompanyDiagnostics } from "../services/diagnostics/useCompanyDiagnostics";`
  - **Line 21:** `// 1. Fetch raw telemetry data...`
    - *Replacement:* `// 1. Fetch raw diagnostic metrics...`
  - **Line 175:** `{/* TELEMETRY SECTION */}`
    - *Replacement:* `{/* DIAGNOSTIC METRICS SECTION */}`

### 2. Dashboard Hub
* **File:** [DashboardHub.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/views/DashboardHub.tsx)
  - **Line 74:** `Telemetry indicators calibration`
    - *Replacement:* `Metric diagnostics status`

### 3. Practice Terminal View
* **File:** [PracticeTerminal.jsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/views/PracticeTerminal.jsx)
  - **Line 2:** `import { WatchlistTelemetry } from '../components/WatchlistTelemetry';`
    - *Replacement:* `import { WatchlistMetrics } from '../components/WatchlistMetrics';`

### 4. Codebase Types Definitions
* **File:** [ChartingTypes.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/types/ChartingTypes.ts)
  - **Line 33-34:** `export interface MarketTelemetry`
    - *Replacement:* `export interface MarketDiagnostics`
  - **Line 171:** `neuralPropagation: boolean;`
    - *Replacement:* `factorPropagation: boolean;`
