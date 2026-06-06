# TRACK-10E — Full Technical Call Graph

## Path A: Offline Batch (FeatureEngine → DB)

```
YahooProvider (external API)
  │
  ├─ expand-market-coverage.ts: generates 500 synthetic stocks + 5yr candles
  │  OR
  └─ run-research-validation.ts: fetches real 5Y history from Yahoo
       │
       ▼
  daily_prices table (PostgreSQL)
       │
       ▼
  FeatureEngine.calculateAndStoreFeatures(symbol)
       │  src/services/FeatureEngine.ts
       │  Lines 49-296
       │
       ├─ Reads: daily_prices (open, high, low, close, volume) ordered by trade_date ASC
       ├─ Computes: RSI(14), MACD(12/26/9), ATR(14), ADX(14), BBWidth(20),
       │             Momentum(10), Volatility(20d ann.), RelStrength,
       │             MADistance(50), TrendStrength(EMA20/50)
       │
       └─ Writes: INSERT INTO feature_snapshots (...) ON CONFLICT UPDATE
                    Line 290
                    └─ Guard: only writes rows where rsi !== null && macd !== null
       │
       ▼
  feature_snapshots table (PostgreSQL)
       │
       ▼
  intelligence.ts — GET /api/stockstory/:symbol
       │  Lines 743-747
       │  pool.query(`SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`)
       │
       ├─ IF feat has all technical fields non-null:
       │     → Direct mapping to EngineInputs.features (lines 798-813)
       │
       └─ IF feat is NULL or has null technical fields:
             → Fallback to Path B
       │
       ▼
  EngineInputs.features = {
    rsi, macd, macdSignal, macdHistogram, adx, atr,
    bollingerWidth, momentum, volatility, relativeStrength,
    movingAverageDistance, trendStrength
  }
       │
       ▼
  StockStoryEngine.evaluate(engineInputs)
       │  src/stockstory/StockStoryEngine.ts:48
       │
       ├─ MomentumEngine.evaluate(inputs)  — uses features.rsi, features.macd,
       │    features.macdSignal, features.macdHistogram, features.adx,
       │    features.trendStrength, features.volatility, features.atr
       │    → produces momentumScore, trendScore, volatilityScore → composite momentum
       │
       ├─ FactorEngine (offline) — also reads feature_snapshots separately
       │    for quality/momentum/growth/risk factor derivation
       │
       └─ computeSectorWeightedHealth() → risk dampening → penalties → Health Score
       │
       ▼
  API Response: { healthScore, classification, confidence, growth, quality, stability, valuation, momentum, risk }
```

---

## Path B: Live Fallback (TechnicalIndicatorEngine → In-Memory)

```
YahooProvider (external API)
       │
       ▼
  ProviderCoordinator.getHistory(sym, "1Y")
       │  src/services/providers/ProviderCoordinator.ts
       │  → YahooProvider.getHistory() → HistoricalPoint[]
       │
       ▼
  TechnicalIndicatorEngine.latestComplete(sym, history)
       │  src/services/TechnicalIndicatorEngine.ts
       │  Lines 144-151
       │
       ├─ TechnicalIndicatorEngine.calculate(sym, history)  — Lines 8-142
       │    │
       │    ├─ Filters: only finite OHLC with close > 0
       │    ├─ Computes: RSI(14), MACD(12/26/9), ATR(14), ADX(14), BBWidth(20),
       │    │             Momentum(10), Volatility(20d ann.), RelStrength (SIMPLE),
       │    │             MADistance(50), TrendStrength(EMA20/50)
       │    │
       │    └─ Returns: StockFeatureSnapshot[] (same type as FeatureEngine)
       │
       └─ latestComplete: finds most recent snapshot where rsi, macd, atr,
           momentum, volatility are ALL non-null
       │
       ▼
  In-memory feat object (NOT persisted to DB)
       │  intelligence.ts lines 780-795
       │  Mapped to DB-like column names:
       │    liveFeat.rsi → feat.rsi
       │    liveFeat.tradeDate → feat.trade_date
       │    etc.
       │
       ▼
  EngineInputs.features (same structure as Path A)
       │
       ▼
  StockStoryEngine.evaluate(engineInputs)  [IDENTICAL to Path A]
       │
       ▼
  API Response
```

---

## Key Architectural Difference

| Aspect | Path A (FeatureEngine) | Path B (TechnicalIndicatorEngine) |
|--------|----------------------|----------------------------------|
| Data source | `daily_prices` DB table | YahooProvider external API |
| Computation trigger | Offline script (batch) | API request (live, on-demand) |
| Result storage | `feature_snapshots` DB table | In-memory only (discarded after response) |
| Used by StockStoryEngine? | YES (via EngineInputs from DB) | YES (via EngineInputs from live calc) |
| Used by FactorEngine? | YES (reads `feature_snapshots` directly) | NO (FactorEngine only reads DB) |
| Used by MarketIntelligenceEngine? | YES (reads `feature_snapshots` directly) | NO (MarketIntelligenceEngine only reads DB) |

---

## Runtime Source Determination (intelligence.ts:780-795)

```typescript
let feat = featRes.rows[0];  // From feature_snapshots DB query

// FALLBACK CHECK
if (!feat || feat.rsi == null || feat.macd == null || feat.atr == null || 
    feat.momentum == null || feat.volatility == null) {
  const coordinator = new ProviderCoordinator();
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

**Decision logic:**
- If DB has complete features → use Path A (FeatureEngine data)
- If DB is empty/has NULLs → use Path B (TechnicalIndicatorEngine live)
- Both paths produce identical `EngineInputs.features` shape
- StockStoryEngine does NOT know which path was used

**At runtime, for the same stock, the source depends on whether `feature_snapshots` has been populated by offline scripts.**
