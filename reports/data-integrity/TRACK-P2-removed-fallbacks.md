# TRACK-P2 — Removed Fallbacks

**Date:** 2026-06-09

Exhaustive audit of every misleading fallback, synthetic claim, and silent default removed or replaced during TRACK-P2.

---

## Complete Fallback Registry

| # | Fallback/Misleading Claim | Source File | Method/Route | Defect(s) | Replacement |
|---|--------------------------|-------------|--------------|-----------|-------------|
| **1** | "100% metrics present (5-year Daily Candles + Key Financials)" | `src/services/InsightEngine.ts` | `generateInsight()` — `coverage` field | DEFECT 1, 3 | Computed from completeness: `"${score}% metrics present (${available}/${total} fields available)"` |
| **2** | "Real-time sync active (Updated today)" | `src/services/InsightEngine.ts` | `generateInsight()` — `freshness` field | DEFECT 1, 3 | Computed from freshness: `"Data is ${freshness} as of ${asOf}. Provider: ${provider || 'unknown'}"` |
| **3** | "High Integrity (Validated by NSE/BSE provider registry)" | `src/services/InsightEngine.ts` | `generateInsight()` — `dataQuality` field | DEFECT 1, 4 | Honest lineage: `"Source: feature_snapshots, factor_snapshots (internal pipeline). Provider: unknown (no validation claims)."` |
| **4** | Silent injection of sample portfolio `[RELIANCE, TCS, INFY, HDFCBANK, HAL]` | `src/backend/web/routes/intelligence.ts` | Portfolio GET/POST routes (fallback handler) | DEFECT 2 | `EMPTY_PORTFOLIO` status with `reason: "No portfolio positions were supplied."` unless explicit `?mode=demo` |
| **5** | Synthetic company intelligence fallback object with fabricated claims | `src/backend/web/routes/intelligence.ts` | `/api/intelligence/company/:symbol` (catch-all else branch) | DEFECT 1 | Route now checks snapshots first: both missing → `unavailableResponse`, one missing → `partialResponse` |
| **6** | "Stable historical margins" | Removed entirely (was in fallback object) | Synthetic fallback | DEFECT 1 | N/A — only computed from real financial data when financial snapshots exist |
| **7** | "balanced trading regimes" | Removed entirely | Synthetic fallback | DEFECT 1 | N/A |
| **8** | "medium business quality rating" | Removed entirely | Synthetic fallback | DEFECT 1 | N/A |
| **9** | "fair value pricing" | Removed entirely | Synthetic fallback | DEFECT 1 | N/A |
| **10** | "neutral momentum indices" | Removed entirely | Synthetic fallback | DEFECT 1 | N/A |
| **11** | "Moderate relative valuation" | Removed entirely | Synthetic fallback | DEFECT 1 | N/A |
| **12** | "Standard sector headwinds" | Removed entirely | Synthetic fallback | DEFECT 1 | N/A |
| **13** | Positive/Negative drivers invented from absent data | Removed entirely | Synthetic fallback | DEFECT 1 | N/A; drivers only generated when real data exists |
| **14** | Inconsistent freshness wording across routes ("live" vs "updated today" vs "current") | Multiple routes | Various freshness claims | DEFECT 3 | Centralized `DataFreshness.ts` with consistent policy: `live` (≤30min), `recent` (≤24h), `stale` (≤7d), `expired` (>7d), `unknown` (no timestamp) |
| **15** | No standardized `asOf` date field | Multiple routes | Various | DEFECT 3 | Every analytical response now includes `dataState.asOf` |
| **16** | Provider identity inferred from context (e.g., "NSE/BSE") without stored provider field | Multiple responses | Various `provider` claims | DEFECT 4 | Provider field = `null` unless stored record contains traceable provider + validation field. "Provider: unknown (no validation claims)" |
| **17** | "complete coverage" claims without evidence | Various responses | Coverage/freshness narratives | DEFECT 4 | Replaced with honest coverage tracking: feature snapshots + factor snapshots status |
| **18** | Implicit demo/production mode mixing — no `mode` field on responses | `src/backend/web/routes/intelligence.ts` | All intelligence routes | DEFECT 5 | Every response now has `mode`: `production_real`, `production_partial`, `production_unavailable`, or `demo` |
| **19** | Demo holdings returned without explicit opt-in | `src/backend/web/routes/intelligence.ts` | Portfolio routes default handler | DEFECT 2, 5 | Demo only via explicit `mode=demo` (GET query or POST body). Demo response includes `isDemo: true`, `mode: 'demo'`, `status: 'demo'` |
| **20** | Missing factor values silently replaced with neutral (50) without disclosure | `src/services/PortfolioIntelligenceEngine.ts` | `evaluatePortfolio()` / `evaluatePortfolioV2()` | DEFECT 6 | Neutralized fields tracked in `neutralizedFields: string[]`. Completeness score reduced proportionally. Response discloses: `"${count} of ${total} factor fields were neutralized (missing source data)"` |
| **21** | Narrative overstates confidence when completeness is low (e.g., "stable business", "healthy margins") | `src/services/NarrativeEngine.ts` | `generateNarrative()` | DEFECT 7 | Narrative now completeness-aware via `generateNarrative()`. When completeness < 70: limitation prefix added. Missing-critical: "Analysis is unavailable because...". Missing-optional: "This is a partial assessment..." |
| **22** | `generateNarrative()` always returns confident analysis regardless of input quality | `src/services/NarrativeEngine.ts` | `generateNarrative()` | DEFECT 7 | Same as #21 — limitation prefix for partial data, unavailable message for absent data |
| **23** | Zero signals and no snapshots returned identical/similar responses | `src/backend/web/routes/intelligence.ts` (signals route) + `src/backend/web/routes/predictions/signals.ts` | Signal routes | DEFECT 8 | Distinct reason codes: `NO_SIGNIFICANT_SIGNALS` (valid empty, `status: 'empty'`) vs `SNAPSHOT_NOT_GENERATED` (unavailable, `status: 'unavailable'`) |
| **24** | Hardcoded leadership trend "Technology sector leading active market flows" in `MarketIntelligenceEngine` | `src/services/MarketIntelligenceEngine.ts` (via intelligence route) | `/api/intelligence/market` fallback | DEFECT 1 | Market route now verifies leadership trends against DB. If no data → empty array, not fabricated |
| **25** | No common response envelope — each route had its own shape | Multiple routes | All analytical routes | DEFECT 10 | All routes now use `AnalyticalResponse<T>` from `src/shared/data/AnalyticalResponse.ts` with `status`, `mode`, `dataState` |
| **26** | `confidenceScore` not coupled to data completeness | Various responses | Confidence calculations | DEFECT 6, 7 | `dataState.completenessScore` now exposed alongside confidence. UI must show completeness and confidence together |
| **27** | `StockStoryEngine` could be called with missing prediction row resulting in fabricated defaults | `src/backend/web/routes/stockstory.ts` + `src/stockstory/StockStoryEngine.ts` | `/api/stockstory/:ticker` | DEFECT 1 | Route now checks prediction_registry first: no row → `PREDICTION_NOT_FOUND` unavailable response |
| **28** | No stale/expired visibility — age of data not exposed | Multiple routes | All analytical routes | DEFECT 3 | `dataState.freshness` exposed on every response with consistent policy |
| **29** | `generateSignalFeed()` returned same structure for no-diffs and no-snapshots | `src/intelligence/SignalFeedEngine.ts` (via route) | `/api/intelligence/signals` | DEFECT 8 | Route now checks `feed.dataSource === 'unavailable'` → `SNAPSHOT_NOT_GENERATED` vs empty signals → `NO_SIGNIFICANT_SIGNALS` |
| **30** | No completeness tracking on any response | All routes | All analytical responses | DEFECT 6 | `dataState.completenessScore` and `dataState.neutralizedFields` now on every analytical response |
| **31** | No lineage tracking — impossible to trace data origin | All routes | All analytical responses | DEFECT 4 | `dataState.lineage: DataLineageEntry[]` on every response: `sourceTable`, `asOf`, `isFallback`, `isSynthetic` |
| **32** | No missing-input disclosure | All routes | All analytical responses | DEFECT 6 | `dataState.missingInputs: string[]` names every missing required input |
| **33** | Database errors could return fake analysis | Multiple routes | Error handlers | DEFECT 8 | Structured `errorResponse` with `status: 'error'`, `mode: 'production_unavailable'`, specific reason codes (`DATABASE_UNAVAILABLE`, `INTERNAL_ERROR`) |
| **34** | No response-generated-at timestamp | All routes | All responses | DEFECT 10 | `generatedAt: string` (ISO timestamp) on every response |

---

## Summary by Defect

| Defect | # Fallbacks Removed | Status |
|--------|---------------------|--------|
| DEFECT 1 — Fabricated claims | 14 (items 1-3, 5-13, 24, 27) | ✅ Fully addressed |
| DEFECT 2 — Silent portfolio injection | 2 (items 4, 19) | ✅ Fully addressed |
| DEFECT 3 — Freshness inconsistency | 4 (items 1-2, 14-15, 28) | ✅ Fully addressed |
| DEFECT 4 — Untraceable claims | 3 (items 16-17, 31) | ✅ Fully addressed |
| DEFECT 5 — Demo/production mixing | 2 (items 18-19) | ✅ Fully addressed |
| DEFECT 6 — Silent neutralization | 3 (items 20, 30, 32) | ✅ Fully addressed |
| DEFECT 7 — Overstated narratives | 2 (items 21-22) | ✅ Fully addressed |
| DEFECT 8 — Conflated states | 2 (items 23, 29) | ✅ Fully addressed |
| DEFECT 9 — UI states | (UI update deferred) | ⚠️ Frontend not yet updated |
| DEFECT 10 — Common envelope | 2 (items 25, 34) | ✅ Fully addressed |

---

## What Remains (Not Fallbacks)

The following are legitimate, honest production behaviors — not fallbacks:

- **Neutral score 50 for missing values** — explicitly disclosed via `neutralizedFields` and reduced `completenessScore`
- **Narrative limitation prefix** — "This is a partial assessment based on available data. Missing: [fields]."
- **`unavailableResponse`** — factual message explaining why analysis is unavailable
- **`partialResponse`** — limited analysis with explicit list of what's missing
- **Demo mode via explicit opt-in** — clearly labeled, isolated cache, never default
- **`NO_SIGNIFICANT_SIGNALS`** — valid empty state, not an error
- **`EMPTY_PORTFOLIO`** — valid empty state, user needs to add positions
