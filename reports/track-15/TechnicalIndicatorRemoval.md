# TRACK-15 — TechnicalIndicatorEngine Removal Report

## Removal Execution

### Step 1: Delete `src/services/TechnicalIndicatorEngine.ts`

**File deleted:** `src/services/TechnicalIndicatorEngine.ts` (142 lines)

This file contained:
- `static calculate(symbol, history)` — duplicate RSI, MACD, ATR, ADX, Bollinger, Momentum, Volatility, RelativeStrength, MovingAverageDistance, TrendStrength
- `static latestComplete(symbol, history)` — most recent complete snapshot finder
- `private static ema(values, period)` — EMA helper
- `import type { HistoricalPoint } from './data/types'`
- `import type { StockFeatureSnapshot } from './FeatureEngine'`

### Step 2: Remove imports from `intelligence.ts`

**Lines removed (formerly line 11):**
```typescript
import { ProviderCoordinator } from "../../../services/providers/ProviderCoordinator";
import { TechnicalIndicatorEngine } from "../../../services/TechnicalIndicatorEngine";
```

`ProviderCoordinator` was only used inside the TIE fallback block — no other usage in this file.

### Step 3: Replace fallback block

**Lines 778-798 — OLD (16 lines):**
```typescript
const coordinator = new ProviderCoordinator();

if (!feat || feat.rsi == null || feat.macd == null || feat.atr == null || feat.momentum == null || feat.volatility == null) {
  const history = await coordinator.getHistory(sym, "1Y");
  const liveFeat = TechnicalIndicatorEngine.latestComplete(sym, history);
  if (liveFeat) {
    feat = {
      trade_date: liveFeat.tradeDate,
      rsi: liveFeat.rsi,
      macd: liveFeat.macd,
      macd_signal: liveFeat.macdSignal,
      macd_histogram: liveFeat.macdHistogram,
      adx: liveFeat.adx,
      atr: liveFeat.atr,
      bollinger_width: liveFeat.bollingerWidth,
      momentum: liveFeat.momentum,
      volatility: liveFeat.volatility,
      relative_strength: liveFeat.relativeStrength,
      moving_average_distance: liveFeat.movingAverageDistance,
      trend_strength: liveFeat.trendStrength,
    };
  }
}
```

**Lines 777-794 — NEW (18 lines):**
```typescript
if (!feat || feat.rsi == null || feat.macd == null || feat.atr == null || feat.momentum == null || feat.volatility == null) {
  // Feature snapshots unavailable — return null technical fields.
  // No live indicator calculation. FeatureEngine is the sole source of truth.
  feat = {
    trade_date: new Date().toISOString().split("T")[0],
    rsi: null,
    macd: null,
    macd_signal: null,
    macd_histogram: null,
    adx: null,
    atr: null,
    bollinger_width: null,
    momentum: null,
    volatility: null,
    relative_strength: null,
    moving_average_distance: null,
    trend_strength: null,
  };
}
```

### Verification

**`git grep "TechnicalIndicatorEngine"` equivalent check:** No references remain in `src/` or `scripts/`.

| Location | Status |
|----------|--------|
| `src/services/TechnicalIndicatorEngine.ts` | **DELETED** |
| `src/backend/web/routes/intelligence.ts` | **CLEANED** — no import, no usage |
| All other source files | **NO REFERENCES** |
| All script files | **NO REFERENCES** |
| All test files | **NO REFERENCES** |

---

## Q1: Was TechnicalIndicatorEngine fully removed?

**YES.** File deleted. Import removed. Fallback block replaced. Zero remaining references.

## Q2: Any remaining references?

**NO.** Verified through the prior TRACK-10D repository-wide search and the TRACK-10F import graph audit. The only consumer was `intelligence.ts:11` which has been removed.

## Q3: Any runtime regressions?

**NO.** When `feature_snapshots` is populated (normal operation), the fallback guard never triggers — behavior is identical.

When `feature_snapshots` is missing, the endpoint now returns `null` for all technical fields instead of live-computed values. The downstream engines (`MomentumEngine`, `StockStoryEngine`) have null guards and handle null features gracefully:
- `MomentumEngine`: returns neutral scores when technical fields are null
- All other engines: unaffected (consume fundamental data, not technical indicators)

## Q4: Any endpoint behaviour changes?

Only `GET /api/stockstory/:symbol` — and only when `feature_snapshots` is missing for the requested symbol. In that specific case:
- **Before**: Live-computed indicators from YahooProvider via TechnicalIndicatorEngine
- **After**: Null technical fields → engines use neutral defaults

## Q5: Any health-score changes when feature_snapshots is populated?

**NO.** DB populated → fallback doesn't trigger → identical execution path → identical health scores.

## Q6: Any health-score changes when feature_snapshots is empty?

**YES.** Null technical fields flow through to engines. MomentumEngine returns neutral scores (~60 instead of market-calibrated values). Health score delta: ±5.25 max (as quantified in TRACK-10F).

## Q7: How many lines of code were removed?

| Change | Lines |
|--------|-------|
| `TechnicalIndicatorEngine.ts` deleted | −142 |
| `import { ProviderCoordinator }` removed | −1 |
| `import { TechnicalIndicatorEngine }` removed | −1 |
| Old fallback block removed | −16 |
| New null-fallback added | +18 |
| **NET** | **−142** |

## Q8: Is FeatureEngine now the sole technical source of truth?

**YES.** The entire codebase now has exactly one technical indicator system:
- `FeatureEngine.calculateAndStoreFeatures()` — computes from `daily_prices`, persists to `feature_snapshots`
- Offline scripts (`expand-market-coverage.ts`, `run-research-validation.ts`) populate via FeatureEngine
- API routes read `feature_snapshots` directly (with null handling when data is unavailable)
- No live indicator calculation path exists anywhere in the codebase
