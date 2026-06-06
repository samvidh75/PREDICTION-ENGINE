# TRACK-15 — Call Graph: Before vs After

## Before (With TechnicalIndicatorEngine)

```
daily_prices (PostgreSQL)
       │
       ▼
FeatureEngine.calculateAndStoreFeatures()     ← offline batch only
       │
       ▼
feature_snapshots (PostgreSQL)
       │
       ▼
intelligence.ts — GET /api/stockstory/:symbol
       │
       ├─ DB has feat → use feature_snapshots
       │
       └─ DB missing/null → FALLBACK
              │
              ├─ ProviderCoordinator.getHistory() → YahooProvider (external API)
              ├─ TechnicalIndicatorEngine.calculate() (in-memory)
              └─ feat = live-computed values
       │
       ▼
EngineInputs.features → StockStoryEngine → Health Score
```

**Two technical indicator systems:**
1. `FeatureEngine` (offline, DB-persisted, 11+ consumers)
2. `TechnicalIndicatorEngine` (live, in-memory, 1 consumer)

---

## After (FeatureEngine Only)

```
daily_prices (PostgreSQL)
       │
       ▼
FeatureEngine.calculateAndStoreFeatures()     ← offline batch only
       │
       ▼
feature_snapshots (PostgreSQL)
       │
       ▼
intelligence.ts — GET /api/stockstory/:symbol
       │
       ├─ DB has feat → use feature_snapshots
       │
       └─ DB missing/null → FALLBACK
              │
              └─ feat = { all null }
       │
       ▼
EngineInputs.features → StockStoryEngine → Health Score
```

**One technical indicator system:**
1. `FeatureEngine` (offline, DB-persisted, single source of truth)

---

## Removed Edges

| Edge | From | To | Reason |
|------|------|----|--------|
| Import | `intelligence.ts` | `TechnicalIndicatorEngine` | File deleted |
| Import | `intelligence.ts` | `ProviderCoordinator` | Only used in TIE fallback |
| API call | `intelligence.ts` | YahooProvider (via ProviderCoordinator) | Fallback removed |
| Computation | `TechnicalIndicatorEngine` | In-memory indicator arrays | File deleted |
| Helper | `TechnicalIndicatorEngine.ema()` | EMA calculation | File deleted |

---

## Preserved Edges

| Edge | From | To | Status |
|------|------|----|--------|
| Query | `intelligence.ts` | `feature_snapshots` table | **UNCHANGED** |
| Query | `intelligence.ts` | `factor_snapshots` table | **UNCHANGED** |
| Query | `intelligence.ts` | `financial_snapshots` table | **UNCHANGED** |
| Query | `intelligence.ts` | `symbols` table | **UNCHANGED** |
| Compute | `FeatureEngine` | `daily_prices` → indicators | **UNCHANGED** |
| Write | `FeatureEngine` | `feature_snapshots` INSERT | **UNCHANGED** |
| Evaluate | `intelligence.ts` | `stockStoryEngine.evaluate()` | **UNCHANGED** |
| All other routes | `intelligence.ts` | Various engines | **UNCHANGED** |
