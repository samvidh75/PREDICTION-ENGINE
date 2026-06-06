# TRACK-10E — Consolidation Recommendation

## The Three Options

### Option A: FeatureEngine Only
Delete `TechnicalIndicatorEngine.ts`. Remove the fallback in `intelligence.ts:780-795`. All technical indicators come from `feature_snapshots` table, populated by offline batch scripts.

### Option B: TechnicalIndicatorEngine Only
Delete `FeatureEngine.ts`. Rewrite `intelligence.ts` to always call `TechnicalIndicatorEngine` live from YahooProvider. Remove `feature_snapshots` technical columns. All indicators computed on-demand.

### Option C: FeatureEngine Primary + TechnicalIndicatorEngine Fallback
Keep both. FeatureEngine remains the primary source (`feature_snapshots`). TechnicalIndicatorEngine remains the live fallback when DB data is missing.

---

## Evidence-Based Analysis

### What FeatureEngine Provides

| Capability | Evidence |
|------------|----------|
| Batch computation from DB | `FeatureEngine.ts:53-61` — reads `daily_prices` table |
| Persistence | `FeatureEngine.ts:290` — INSERT INTO feature_snapshots |
| Market-relative strength | `FeatureEngine.ts:195-201` — queries market avg from DB |
| Used by FactorEngine | `FactorEngine.ts:54` — reads feature_snapshots |
| Used by MarketIntelligenceEngine | `MarketIntelligenceEngine.ts:20-21` — reads feature_snapshots for breadth |
| Used by multiple API routes | intelligence.ts:37, 583, 657, 747, 766 — 5+ query sites |
| Used by offline scripts | calibrate.ts, calibrate_v2.ts, run-explainability-pipeline.ts, run-research-validation.ts |

### What TechnicalIndicatorEngine Provides

| Capability | Evidence |
|------------|----------|
| Live computation from external API | `TechnicalIndicatorEngine.ts:8-10` — takes `HistoricalPoint[]` |
| No persistence | No DB writes anywhere |
| No market context | `relativeStrength` is just daily return, not market-relative |
| Used by exactly ONE code path | `intelligence.ts:780-795` — stockstory fallback only |
| NOT used by FactorEngine | FactorEngine never imports it |
| NOT used by MarketIntelligenceEngine | MarketIntelligenceEngine never imports it |
| NOT used by any offline script | No script imports it |

### Consumer Dependency Matrix

| Consumer | Depends on FeatureEngine (via feature_snapshots) | Depends on TechnicalIndicatorEngine |
|----------|---------------------------------------------------|-------------------------------------|
| `GET /api/stockstory/:symbol` | YES (primary) | YES (fallback) |
| `GET /api/intelligence/company/:symbol` | YES | NO |
| `GET /api/company/:symbol/risks` | YES | NO |
| `GET /api/company/:symbol/catalysts` | YES | NO |
| `FactorEngine` (offline) | YES | NO |
| `MarketIntelligenceEngine` | YES | NO |
| `FeatureImportanceEngine` | YES | NO |
| `calibrate.ts` | YES | NO |
| `calibrate_v2.ts` | YES | NO |
| `run-explainability-pipeline.ts` | YES | NO |
| `run-research-validation.ts` | YES | NO |

**FeatureEngine serves 11+ consumers. TechnicalIndicatorEngine serves 1 consumer (as fallback).**

---

## Option A: Delete TechnicalIndicatorEngine

### Feasibility
- Remove `import { TechnicalIndicatorEngine }` from `intelligence.ts:11`
- Remove fallback block at `intelligence.ts:780-795`
- Delete `src/services/TechnicalIndicatorEngine.ts`
- When `feature_snapshots` is missing, return an error or use the existing hardcoded fallback (already present in `GET /api/intelligence/company/:symbol`)

### Risk
- If DB is empty and YahooProvider is unavailable, stockstory endpoint will fail instead of gracefully degrading
- The hardcoded fallback in the intelligence route (lines 55-83) already handles this case with sensible defaults

### Maintenance Gain
- Eliminates 142 lines of duplicate indicator math
- Eliminates 1 file
- No more formula divergence risk (relativeStrength)
- Single source of truth for all technical indicators

### Verdict: **LOW RISK, HIGH REWARD**

---

## Option B: Delete FeatureEngine

### Feasibility
- Would break FactorEngine (reads feature_snapshots directly)
- Would break MarketIntelligenceEngine (reads feature_snapshots for market breadth)
- Would break ALL offline scripts (calibrate, explainability, research)
- Would require every API request to call external YahooProvider → latency, rate limits, cost
- Would require migrating feature_snapshots-dependent queries to live computation

### Risk
- **CATASTROPHIC** — breaks 11+ consumers, introduces external API dependency for every request
- MarketIntelligenceEngine's `marketBreadth` query (aggregate across ALL symbols) becomes impossible without DB

### Verdict: **NOT VIABLE**

---

## Option C: Keep Both (Status Quo)

### Feasibility
- No code changes
- Continues serving both paths

### Risk
- Formula divergence (relativeStrength differs between FE and TIE) — if fallback triggers, API returns different relativeStrength values
- Duplicate code maintenance — any indicator formula change requires two edits
- Confusion about source of truth (which system produced the values?)
- 142 lines of dead code in normal operation (DB populated)

### Verdict: **VIABLE BUT SUBOPTIMAL**

---

## Recommendation: Option A — FeatureEngine Only

### Justification

1. **FeatureEngine serves 11 consumers; TIE serves 1.** The dependency ratio is 11:1.

2. **TIE is dead code in normal operation.** When `feature_snapshots` is populated (which is the intended production state), TIE is never called. Those 142 lines exist solely for a cold-start/empty-DB scenario.

3. **TIE has a formula bug.** `relativeStrength` in TIE is computed as simple daily return, not market-relative. This means the fallback produces semantically different data than the primary path.

4. **The existing hardcoded fallback is sufficient.** `GET /api/intelligence/company/:symbol` (lines 55-83) already handles missing data with sensible defaults. The stockstory route can adopt the same pattern.

5. **Lowest maintenance burden.** One file deleted, one import removed, one fallback block removed. No new dependencies. No external API calls added.

### Recommended Implementation

```typescript
// intelligence.ts — REPLACE lines 780-795
// OLD:
if (!feat || feat.rsi == null || feat.macd == null || feat.atr == null || feat.momentum == null || feat.volatility == null) {
  const coordinator = new ProviderCoordinator();
  const history = await coordinator.getHistory(sym, "1Y");
  const liveFeat = TechnicalIndicatorEngine.latestComplete(sym, history);
  if (liveFeat) { feat = { ... }; }
}

// NEW:
if (!feat || feat.rsi == null || feat.macd == null || feat.atr == null || feat.momentum == null || feat.volatility == null) {
  // Feature snapshots not yet populated for this symbol.
  // Return neutral defaults until offline batch processing completes.
  feat = {
    trade_date: new Date().toISOString().split("T")[0],
    rsi: 50, macd: 0, macd_signal: 0, macd_histogram: 0,
    adx: 25, atr: 1, bollinger_width: 0.02, momentum: 0,
    volatility: 0.25, relative_strength: 0,
    moving_average_distance: 0, trend_strength: 0
  };
}
```

### Files to Delete
- `src/services/TechnicalIndicatorEngine.ts` (142 lines)

### Files to Modify
- `src/backend/web/routes/intelligence.ts`:
  - Remove line 11: `import { TechnicalIndicatorEngine }`
  - Replace lines 780-795 with neutral defaults
  - Remove `import { ProviderCoordinator }` if not used elsewhere in this file (currently imported at line 11 — keep if used elsewhere)

### Regression Risk
- Stockstory endpoint returns neutral/default technical values when DB is empty (instead of live-computed values)
- This is identical behavior to the intelligence endpoint's existing fallback (lines 55-83)
- Once DB is populated, behavior is unchanged

---

## Final Architecture

```
daily_prices (PostgreSQL)
       │
       ▼
FeatureEngine.calculateAndStoreFeatures()
  (offline batch — expand-market-coverage.ts, run-research-validation.ts)
       │
       ▼
feature_snapshots (PostgreSQL)
       │
       ▼
intelligence.ts — all API routes
       │
       ├─ DB has data → use feature_snapshots
       └─ DB empty → use neutral defaults (50, 0, 25, etc.)
       │
       ▼
StockStoryEngine.evaluate(engineInputs)
       │
       ▼
{ healthScore, classification, ... }
```

**One engine. One source of truth. Zero duplicate code. Zero formula divergence.**
