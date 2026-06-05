# Compliance Audit

Date: 2026-06-05

Track: Track-5 Compliance & Terminology Audit

## Objective

Remove legacy, misleading, prototype-era terminology from user-facing surfaces while keeping engine logic, database logic, and UI layout unchanged.

## Files Updated

| File | Change |
|---|---|
| `src/components/PredictivePanel.tsx` | Visible label changed from probabilistic/predictive-style framing to Company Health Analysis. Disclaimer replaced with required StockStory research-intelligence disclaimer. |
| `src/components/PredictiveHologram.tsx` | Visible chart labels changed to Health Classification Range and Market Trend. |
| `src/components/HealthometerWidget.jsx` | Visible loading label changed from Telemetry Loading to Market Data Loading. |
| `src/pages/StockStoryPage.tsx` | Company page now shows Explanation, Factor Breakdown, Health Score, Confidence, and the required non-advice disclaimer. |
| `src/services/NarrativeEngine.ts` | Generated narratives no longer say StockStory recommends. They now describe company health classification. |
| `src/services/intelligence/clientIntelligenceProvider.ts` | Static fallback narratives no longer say StockStory recommends. |
| `src/components/dashboard/TodayIntelligenceBrief.tsx` | Narrative Summary changed to Explanation. |
| `src/components/HealthSummaryCard.tsx` | Exchange Node Health Telemetry changed to Exchange Health Overview. |
| `src/components/macro/MacroIntelligenceEngine.tsx` | Planetary Market Telemetry System changed to Global Market Flow System. |
| `src/components/MarketHydrator.jsx` | Live Telemetry changed to Live Data. |
| `src/components/WatchlistTelemetry.tsx` | Watchlist Telemetry Feed changed to Watchlist Market Feed. |
| `src/components/RangeInfographic.tsx` | 52-Week Pricing Telemetry Range changed to 52-Week Price Range. |
| `src/components/SimulatedPortfolio.tsx` | Position Telemetry List changed to Position List. |
| `src/components/dashboard/MarketPulseLayer.tsx` | Telemetry offline changed to Market data offline. |
| `src/components/StoryDocumentary.tsx` | AI nodes/cloud telemetry copy replaced with normal cloud/software business language. |
| `TerminologyAudit.md` | Current audit generated. |
| `ComplianceAudit.md` | Current compliance report generated. |

## Terms Removed From User-Facing Copy

| Removed term | Replacement |
|---|---|
| Prediction / Predictive Intelligence | Research Signal / Company Health |
| Recommendation / recommends | Health Classification / classifies |
| AI Forecast | Market Intelligence |
| Buy Signal | Positive Signal |
| Sell Signal | Negative Signal |
| Telemetry | Market Data / Market Feed / Market Flow / Price Range |
| Hologram / Holographic | Analysis visualization / internal only |
| Neural | Market / internal only |

## Required Company Page Disclosure

The active company page `src/pages/StockStoryPage.tsx` now includes:

> StockStory provides research intelligence and health assessments. It does not provide personalised investment advice.

Company page verification:

| Required item | Status |
|---|---|
| Health Score | Present |
| Confidence | Present |
| Factor Breakdown | Present |
| Explanation | Present |
| Non-advice disclosure | Present |

## Terms Retained Internally

The following names remain where changing them would alter engine/API boundaries or create unnecessary refactor risk:

| Internal term | Retained location | Reason |
|---|---|---|
| `PredictionEngine` / `PredictionPayload` | Services/types | Internal API naming; not exposed as user copy. |
| `PredictivePanel` / `PredictiveHologram` | Component names/imports | Internal module names; visible labels were cleaned. |
| `usePredictiveAnalysis` | Engine hook | Internal hook; logic unchanged. |
| `TelemetrySnapshot` / `TelemetryPanel` | Types/components | Internal derived metric naming; visible labels cleaned where found. |
| `NeuralMarketSynthesisEngine` | Synthesis services/types | Internal engine naming; logic unchanged. |
| `HolographicTelemetryEngine` | Existing visual component import | Internal component name; rendered label cleaned where found. |
| CSS classes such as `ss-telemetry-*` and `shadow-hologram-*` | Styling | Not visible text. |

## Remaining Risks

- Some old components still have internal names containing `Predictive`, `Telemetry`, `Neural`, or `Holographic`. They are not currently exposed as visible copy after this pass, but a future refactor should rename modules once engine/API boundaries are stable.
- Some archived Markdown reports still contain old terminology. They are not product UI.
- Some comments still contain old terminology. They are not user-facing.
- `PremiumFeatureGate.tsx` still contains a sanitizer regex for `no recommendations`; this is retained because it removes problematic copy rather than displaying it.

## Verification

Commands run:

- `npm run typecheck` — PASS
- `npm run build` — PASS

Active forbidden-copy scan after cleanup:

- `StockStory recommends` — none in active UI/provider scan
- `Recommendation` — none in active UI/provider scan except sanitizer regex
- `Buy Signal` — none
- `Sell Signal` — none
- `AI Forecast` — none
- `Predictive Intelligence` — none
- `Telemetry Loading` — none
- `Probability Distribution` — none
- `Trend Direction` — none
- `Narrative Summary` — none
- `Factor Engine Scores` — none
- `Exchange Node Health Telemetry` — none
- `Planetary Market Telemetry System` — none
- `Live Telemetry` — none
- `Watchlist Telemetry Feed` — none
- `Position Telemetry List` — none
- `52-Week Pricing Telemetry Range` — none
- `cloud telemetry` — none
- `AI nodes` — none

## Final Status

Compliance cleanup is complete for active user-facing terminology covered by Track-5.

The app now distinguishes:

- Research Signal: non-personalized research context.
- Health Score: derived company health metric.
- Investment Recommendation: not provided by StockStory.
