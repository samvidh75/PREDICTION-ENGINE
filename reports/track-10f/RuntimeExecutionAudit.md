# TRACK-10F — Runtime Execution Audit

## Test A: Database Populated (Normal Operation)

### Preconditions
- PostgreSQL running
- `feature_snapshots` populated with FeatureEngine data
- RELIANCE has complete technical fields (rsi, macd, atr, momentum, volatility all non-null)

### Execution Trace

```
GET /api/stockstory/RELIANCE
  │
  ├─ featRes = pool.query(`SELECT * FROM feature_snapshots WHERE symbol='RELIANCE' ORDER BY trade_date DESC LIMIT 1`)
  │  → featRes.rows[0] = { rsi: 55.2, macd: 2.3, atr: 12.5, momentum: 0.03, volatility: 0.28, ... }
  │
  ├─ feat = featRes.rows[0]  // non-null
  │
  ├─ Fallback check (line 780):
  │   !feat → false
  │   feat.rsi == null → false (55.2)
  │   feat.macd == null → false (2.3)
  │   feat.atr == null → false (12.5)
  │   feat.momentum == null → false (0.03)
  │   feat.volatility == null → false (0.28)
  │   → FALLBACK DOES NOT EXECUTE
  │
  ├─ TechnicalIndicatorEngine.latestComplete() → NEVER CALLED
  ├─ ProviderCoordinator.getHistory() → NEVER CALLED
  ├─ YahooProvider external API → NEVER CALLED
  │
  ├─ engineInputs built from feature_snapshots data
  ├─ stockStoryEngine.evaluate(engineInputs)
  └─ Response returned
```

### Result
- **TIE never executes**
- **No external API calls**
- **Outputs unchanged** from current behavior
- **Zero performance impact from TIE removal** (TIE was never called)

---

## Test B: Database Missing (Cold Start / Empty DB)

### Preconditions
- PostgreSQL may or may not be running
- `feature_snapshots` has no row for RELIANCE (or table is empty)

### Execution Trace — CURRENT (With TIE)

```
GET /api/stockstory/RELIANCE
  │
  ├─ featRes = pool.query(`SELECT * FROM feature_snapshots WHERE symbol='RELIANCE' ...`)
  │  → featRes.rows[0] = undefined
  │
  ├─ feat = undefined
  │
  ├─ Fallback check (line 780):
  │   !feat → true → FALLBACK TRIGGERS
  │
  ├─ coordinator = new ProviderCoordinator()
  ├─ history = await coordinator.getHistory("RELIANCE", "1Y")  // → YahooProvider API call
  ├─ liveFeat = TechnicalIndicatorEngine.latestComplete("RELIANCE", history)
  │   │
  │   └─ Calculates all 12 indicators from Yahoo candle data (in-memory, ~10-50ms)
  │
  ├─ feat = { rsi, macd, ..., trendStrength } from liveFeat
  ├─ engineInputs built from live-computed feat
  ├─ stockStoryEngine.evaluate(engineInputs)
  └─ Response returned with live-computed technical indicators
```

**TIE execution: YES — triggered and executed.**
**External API call: YES — YahooProvider.getHistory() called.**
**Latency added: ~200-2000ms (Yahoo API roundtrip).**

### Execution Trace — AFTER REMOVAL (With Neutral Defaults)

```
GET /api/stockstory/RELIANCE
  │
  ├─ featRes = pool.query(`SELECT * FROM feature_snapshots WHERE symbol='RELIANCE' ...`)
  │  → featRes.rows[0] = undefined
  │
  ├─ feat = undefined
  │
  ├─ Fallback check (NEW):
  │   !feat → true → FALLBACK TRIGGERS (neutral defaults)
  │
  ├─ feat = {
  │     trade_date: today,
  │     rsi: 50, macd: 0, macd_signal: 0, macd_histogram: 0,
  │     adx: 25, atr: 1, bollinger_width: 0.02, momentum: 0,
  │     volatility: 0.25, relative_strength: 0,
  │     moving_average_distance: 0, trend_strength: 0
  │   }
  │
  ├─ technicalIndicatorEngine → NOT CALLED (file deleted)
  ├─ ProviderCoordinator → NOT CALLED
  ├─ YahooProvider → NOT CALLED
  │
  ├─ engineInputs built from neutral defaults
  ├─ stockStoryEngine.evaluate(engineInputs)
  └─ Response returned with neutral technical indicators
```

**TIE execution: NO (file deleted).**
**External API call: NO.**
**Latency added: ~0ms.**

---

## Score Delta Analysis: CURRENT (TIE) vs AFTER REMOVAL (Neutral Defaults)

### MomentumEngine Score Impact

| Sub-score | With TIE (live data) | With Neutral Defaults | Delta |
|-----------|---------------------|----------------------|-------|
| rsiScore | RSI-based (actual: 30-70 range → 25-90) | RSI=50 → 75 | Variable |
| macdScore | MACD-based (actual values) | MACD=0, Signal=0, Hist=0 → 45 | Variable |
| adxScore | ADX-based (actual: 15-50 range → 30-80) | ADX=25 → 60 | Variable |
| trendStrengthScore | trendStrength-based | 0 → 55 | Variable |
| volatilityScore | vol + ATR based | vol=0.25, atr=1 → ~65 | Variable |
| **Composite momentum** | **Weighted blend** | **~60** | **Depends on market** |

**Key insight:** With neutral defaults (RSI=50, MACD=0, ADX=25), MomentumEngine produces a **neutral-to-slightly-bullish composite score (~58-62)**. This is intentional — when we don't have data, we default to neutral.

### Health Score Impact

Health score = sectorWeighted(growth × 25% + quality × 25% + stability × 20% + momentum × 15% + valuation × 15%) − riskDampening − penalties

Momentum contributes 15% of the pre-adjustment health. A momentum delta of ±10 changes health by at most ±1.5 points.

| Scenario | TIE Momentum | Neutral Momentum | Health Delta |
|----------|-------------|------------------|-------------|
| Strong bull (RSI=65, MACD strong, ADX=40) | ~80 | ~60 | −3.0 |
| Neutral (RSI=50, MACD flat, ADX=25) | ~60 | ~60 | 0 |
| Strong bear (RSI=25, MACD weak, ADX=15) | ~25 | ~60 | +5.25 |

**Maximum health score delta: ±5.25 points.** Classification boundaries are at 30, 45, 65, 80 — a 5-point shift could theoretically change classification in borderline cases.

### Confidence Score Impact

ConfidenceEngine evaluates data completeness, signal agreement, risk consistency, and historical stability — **none of which depend on TIE specifically**. Confidence scores are driven by data availability (how many fields are non-null), not by which engine computed them. Neutral defaults (all non-null) produce HIGH confidence, same as TIE-computed values (all non-null).

**Confidence delta: 0** (both paths produce fully-populated feat objects).

---

## API Response Delta Summary

| Field | With TIE | Without TIE (Neutral) | Max Delta |
|-------|----------|----------------------|-----------|
| healthScore | Live-calculated | Neutral | ±5.25 |
| classification | Based on healthScore | Based on healthScore | Borderline shifts possible |
| confidence | High (complete data) | High (complete data) | 0 |
| momentum.score | Live-calculated | ~60 | ±30 |
| growth.score | Unaffected (fundamentals) | Unaffected | 0 |
| quality.score | Unaffected (fundamentals) | Unaffected | 0 |
| stability.score | Unaffected (fundamentals) | Unaffected | 0 |
| valuation.score | Unaffected (fundamentals) | Unaffected | 0 |
| risk.score | Unaffected (fundamentals + vol from features) | Slightly different (vol=0.25) | ±5 |
| engineDetails.momentum.* | Live-calculated sub-scores | Neutral sub-scores | Significant |
| narrative | Minor text differences | Minor text differences | Negligible |

---

## Verdict on Runtime Impact

- **Normal operation (DB populated): ZERO impact.** TIE never executes. Removal changes nothing.
- **Cold start (DB empty): TECHNICAL INDICATORS CHANGE.** Live market-calibrated values → neutral defaults. Health score shifts by at most ±5.25 points. The stockstory endpoint still works but returns "neutral/unknown" momentum rather than live-computed momentum.
