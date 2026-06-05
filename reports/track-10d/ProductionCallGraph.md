# TRACK-10D — Production Call Graph

## `GET /api/stockstory/:symbol` — Exact Call Graph

### Route Registration

**File:** `src/backend/web/routes/intelligence.ts`
**Line:** ~726
```typescript
app.get("/api/stockstory/:symbol", async (request, reply) => {
```

The route is registered on the Fastify app via `intelligenceRoutes` plugin, which is imported in `src/backend/web/app.ts` (or `src/backend/web/routes/index.ts`).

---

### Step-by-Step Call Graph

```
HTTP Request: GET /api/stockstory/RELIANCE
│
├─ [1] Route Handler: intelligence.ts:726
│   app.get("/api/stockstory/:symbol", async (request, reply) => {
│
├─ [2] Cache Check: intelligence.ts:731
│   intelligenceCache.get(`stockstory:${sym}`)
│   → If hit, return cached result immediately
│
├─ [3] DB Query — Symbol Metadata: intelligence.ts:737-740
│   pool.query(`SELECT sector FROM symbols WHERE symbol = $1`, [sym])
│   → Returns sector (defaults to "Technology")
│
├─ [4] DB Query — Feature Snapshots: intelligence.ts:743-747
│   pool.query(`SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [sym])
│   → Returns latest feat row (or undefined)
│
├─ [5] DB Query — Factor Snapshots: intelligence.ts:750-754
│   pool.query(`SELECT * FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [sym])
│   → Returns latest fact row (or undefined)
│
├─ [6] DB Query — Financial Snapshots: intelligence.ts:757-761
│   pool.query(`SELECT * FROM financial_snapshots WHERE symbol = $1 ORDER BY period_end DESC LIMIT 1`, [sym])
│   → Returns latest fin row (or undefined)
│
├─ [7] DB Query — Historical Features (30 rows): intelligence.ts:764-768
│   pool.query(`SELECT trade_date, rsi, macd_histogram, adx, volatility FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 30`, [sym])
│
├─ [8] DB Query — Historical Factors (15 rows): intelligence.ts:771-775
│   pool.query(`SELECT trade_date, factor_score, quality_factor, risk_factor, growth_factor FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 15`, [sym])
│
├─ [9] FALLBACK CHECK (if feat is NULL or missing technicals): intelligence.ts:780-795
│   if (!feat || feat.rsi == null || feat.macd == null || feat.atr == null || feat.momentum == null || feat.volatility == null) {
│     const coordinator = new ProviderCoordinator();
│     const history = await coordinator.getHistory(sym, "1Y");     // → YahooProvider (external API)
│     const liveFeat = TechnicalIndicatorEngine.latestComplete(sym, history);  // in-memory calc
│     if (liveFeat) { feat = { ...liveFeat mapped } }
│   }
│
├─ [10] Build EngineInputs: intelligence.ts:798-850
│   engineInputs = {
│     symbol, tradeDate,
│     features: { rsi, macd, macdSignal, macdHistogram, adx, atr, bollingerWidth, momentum, volatility, relativeStrength, movingAverageDistance, trendStrength },
│     factors: { qualityFactor, valueFactor, growthFactor, momentumFactor, riskFactor, sectorStrengthFactor, factorScore },
│     financials: { peRatio, pbRatio, eps, dividendYield, beta, marketCap, freeFloat, fcfYield, evEbitda, roe, roic, debtToEquity, currentRatio, revenueGrowth, profitGrowth, epsGrowth, fcfGrowth, grossMargin, operatingMargin },
│     historical: { featureHistory[], factorHistory[] },
│     sector: { name, sectorStrength, sectorMomentum }
│   }
│
├─ [11] StockStoryEngine.evaluate(): intelligence.ts:853
│   stockStoryEngine.evaluate(engineInputs)
│   │
│   ├─ [11a] GrowthEngine.evaluate(inputs)       — src/stockstory/engines/GrowthEngine.ts
│   ├─ [11b] QualityEngine.evaluate(inputs)      — src/stockstory/engines/QualityEngine.ts
│   ├─ [11c] StabilityEngine.evaluate(inputs)    — src/stockstory/engines/StabilityEngine.ts
│   ├─ [11d] MomentumEngine.evaluate(inputs)     — src/stockstory/engines/MomentumEngine.ts
│   │   │
│   │   ├─ Converts RSI → rsiScore (0-100)
│   │   ├─ Converts MACD/Signal/Histogram → macdScore (0-100)
│   │   ├─ Converts ADX → adxScore (0-100)
│   │   ├─ Converts trendStrength → trendStrengthScore (0-100)
│   │   ├─ Converts volatility + ATR → volatilityScore (0-100)
│   │   └─ Weighted composite: momentum(5) + trend(3) + volatility(2)
│   │
│   ├─ [11e] ValuationEngine.evaluate(inputs)    — src/stockstory/engines/ValuationEngine.ts
│   ├─ [11f] RiskEngine.evaluate(inputs)         — src/stockstory/engines/RiskEngine.ts
│   ├─ [11g] AccountingEngine.evaluate(inputs)   — src/stockstory/engines/AccountingEngine.ts
│   │
│   ├─ [11h] computeSectorWeightedHealth()       — src/stockstory/sectors/SectorWeightEngine.ts
│   ├─ [11i] Penalty Framework:
│   │   ├─ evaluateAccountingPenalty(inputs)
│   │   ├─ evaluateDebtPenalty(inputs)
│   │   ├─ evaluateVolatilityPenalty(inputs)
│   │   ├─ evaluateGovernancePenalty(inputs)
│   │   └─ applyPenalties(dampenedHealth, allPenalties)
│   │
│   ├─ [11j] classify(adjustedHealth, risk.score) → "Excellent"|"Healthy"|"Stable"|"Weakening"|"At Risk"
│   ├─ [11k] confidenceEngine.evaluate(inputs, scores) → ConfidenceLevel
│   ├─ [11l] assessFreshness(inputs) → "Live"|"Recent"|"Stale"|"Unavailable"
│   └─ [11m] generateNarrative(...) → text
│
├─ [12] Cache & Return: intelligence.ts:854-855
│   intelligenceCache.set(cacheKey, storyResult)
│   return storyResult
│
└─ Response JSON:
    {
      healthScore, classification, confidence,
      growth, quality, stability, valuation, momentum, risk,
      narrative, engineDetails, penaltyDetails,
      generatedAt, dataFreshness
    }
```

---

## Exact Line References

| Step | File | Lines |
|------|------|-------|
| Route registration | `src/backend/web/routes/intelligence.ts` | 726 |
| Cache check | `intelligence.ts` | 731-734 |
| Symbol sector query | `intelligence.ts` | 737-740 |
| Feature snapshots query | `intelligence.ts` | 743-747 |
| Factor snapshots query | `intelligence.ts` | 750-754 |
| Financial snapshots query | `intelligence.ts` | 757-761 |
| Historical features query | `intelligence.ts` | 764-768 |
| Historical factors query | `intelligence.ts` | 771-775 |
| TechnicalIndicatorEngine fallback | `intelligence.ts` | 780-795 |
| EngineInputs construction | `intelligence.ts` | 798-850 |
| StockStoryEngine.evaluate | `src/stockstory/StockStoryEngine.ts` | 48-113 |
| MomentumEngine.evaluate | `src/stockstory/engines/MomentumEngine.ts` | 21-127 |
| GrowthEngine.evaluate | `src/stockstory/engines/GrowthEngine.ts` | (similar pattern) |
| QualityEngine.evaluate | `src/stockstory/engines/QualityEngine.ts` | (similar pattern) |
| StabilityEngine.evaluate | `src/stockstory/engines/StabilityEngine.ts` | (similar pattern) |
| ValuationEngine.evaluate | `src/stockstory/engines/ValuationEngine.ts` | (similar pattern) |
| RiskEngine.evaluate | `src/stockstory/engines/RiskEngine.ts` | (similar pattern) |
| ConfidenceEngine.evaluate | `src/stockstory/engines/ConfidenceEngine.ts` | (similar pattern) |
| Cache set + return | `intelligence.ts` | 853-855 |

---

## Key Architectural Insight

The `GET /api/stockstory/:symbol` endpoint uses a **two-tier data sourcing** strategy:

1. **Primary**: Read pre-computed features from `feature_snapshots` table (populated offline by `FeatureEngine` batch processing)
2. **Fallback**: If `feature_snapshots` has NULL technical fields, compute live via `TechnicalIndicatorEngine` from external API history (`ProviderCoordinator.getHistory()` → YahooProvider)

The live fallback results are **never persisted** back to the database — they exist only for the duration of the API response.
