# Terminology Audit

Date: 2026-06-05

Scope:
- Full repository scan excluding `node_modules`, `dist`, and coverage output.
- Active UI scan across `src/components`, `src/pages`, `src/views`, active client intelligence fallbacks, and narrative generation.

Search terms:
- Prediction
- Predictive
- Neural
- Hologram
- Telemetry
- AI Forecast
- Recommendation
- Buy Signal
- Sell Signal

## User-Facing Findings

| File path | Component / surface | Term found | User visible? | Status |
|---|---|---:|---:|---|
| `src/components/PredictivePanel.tsx` | Company health panel | Predictive / holographic / telemetry-derived labels | Yes | Cleaned visible copy. Internal component name retained. |
| `src/components/PredictiveHologram.tsx` | Analysis visualization | Probability Distribution / Trend Direction | Yes | Replaced with Health Classification Range / Market Trend. Internal component name retained. |
| `src/components/HealthometerWidget.jsx` | Health widget | Telemetry Loading | Yes | Replaced with Market Data Loading. Internal type names retained. |
| `src/pages/StockStoryPage.tsx` | Company page | Narrative Summary / Factor Engine Scores / engine loading phrasing | Yes | Replaced with Explanation / Factor Breakdown / Loading company health analysis. |
| `src/services/NarrativeEngine.ts` | Generated company narrative | StockStory recommends | Yes, rendered through company narrative | Replaced with neutral company health classification language. |
| `src/services/intelligence/clientIntelligenceProvider.ts` | Static client fallback narratives | StockStory recommends | Yes, rendered fallback copy | Replaced with neutral company health classification language. |
| `src/components/dashboard/TodayIntelligenceBrief.tsx` | Dashboard brief | Narrative Summary | Yes | Replaced with Explanation. |
| `src/components/HealthSummaryCard.tsx` | Health summary card | Exchange Node Health Telemetry | Yes | Replaced with Exchange Health Overview. |
| `src/components/macro/MacroIntelligenceEngine.tsx` | Macro intelligence panel | Planetary Market Telemetry System | Yes | Replaced with Global Market Flow System. |
| `src/components/MarketHydrator.jsx` | Live data status badge | Live Telemetry | Yes | Replaced with Live Data. |
| `src/components/WatchlistTelemetry.tsx` | Watchlist market feed | Watchlist Telemetry Feed | Yes | Replaced with Watchlist Market Feed. |
| `src/components/RangeInfographic.tsx` | 52-week range component | 52-Week Pricing Telemetry Range | Yes | Replaced with 52-Week Price Range. |
| `src/components/SimulatedPortfolio.tsx` | Portfolio list | Position Telemetry List | Yes | Replaced with Position List. |
| `src/components/dashboard/MarketPulseLayer.tsx` | Market pulse status | Telemetry offline | Yes | Replaced with Market data offline. |
| `src/components/StoryDocumentary.tsx` | Company documentary text | AI nodes / cloud telemetry | Yes | Replaced with normal cloud/software business language. |

## Internal-Only Findings Retained

| File path / pattern | Component / system | Term retained | User visible? | Reason |
|---|---|---:|---:|---|
| `src/services/synthesis/neuralMarketSynthesis*` | Market synthesis engine | Neural | No direct UI label | Internal engine/type naming. Logic unchanged by Track-5. |
| `src/components/telemetry/*` | Derived health metric components | Telemetry / Holographic | Mostly internal identifiers | Existing module/type names. Visible labels were cleaned where found. |
| `src/engine/hooks/usePredictiveWorker.ts` | Worker hook | Predictive | Internal hook/API | Logic unchanged by Track-5. |
| `src/services/PredictionEngine.ts` | Health/research signal generator | Prediction | Internal service/API | Engine naming retained to avoid logic/API changes. |
| `src/types/*` | Type definitions | Prediction / Telemetry / Neural | Internal | Type names retained to avoid unrelated refactors. |
| CSS classes such as `ss-telemetry-*`, `shadow-hologram-*` | Styling tokens | Telemetry / Hologram | Not visible text | Class names only; no user copy. |
| Test files and docs | QA / documentation | Various terms | No active product UI | Not rendered in the app. |

## Forbidden User Terms

These must not appear as user-facing product copy:
- Prediction
- Predictive Intelligence
- Neural
- Hologram
- Telemetry
- AI Forecast
- Recommendation
- Buy Signal
- Sell Signal

## Allowed User Terms

Use these instead:
- Research Signal
- Company Health
- Health Score
- Health Classification
- Market Intelligence
- Positive Signal
- Negative Signal
- Confidence
- Factor Breakdown
- Explanation

## Allowed Internal Terms

These are allowed only as implementation names, imports, types, comments, or non-rendered module names:
- `PredictionEngine`
- `PredictionPayload`
- `PredictivePanel`
- `PredictiveHologram`
- `usePredictiveAnalysis`
- `TelemetrySnapshot`
- `TelemetryPanel`
- `NeuralMarketSynthesisEngine`
- `HolographicTelemetryEngine`

## Verification

Active visible-copy scan after cleanup found no remaining direct matches for:
- `StockStory recommends`
- `Recommendation`
- `Buy Signal`
- `Sell Signal`
- `AI Forecast`
- `Predictive Intelligence`
- `Telemetry Loading`
- `Probability Distribution`
- `Trend Direction`
- `Narrative Summary`
- `Factor Engine Scores`
- `Exchange Node Health Telemetry`
- `Planetary Market Telemetry System`
- `Live Telemetry`
- `Watchlist Telemetry Feed`
- `Position Telemetry List`
- `52-Week Pricing Telemetry Range`
- `cloud telemetry`
- `AI nodes`

Remaining matches are internal identifiers, CSS class names, comments, tests, or sanitizer rules.
