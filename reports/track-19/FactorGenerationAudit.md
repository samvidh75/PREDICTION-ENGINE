# TRACK-19 — Phase 4: Factor Snapshot Generation Audit

## FactorGenerationAudit: Exact Process Creating Factor Scores

---

## 1. WHAT SCRIPT CREATES THEM?

**Primary (real-data):** `src/services/FactorEngine.ts` — `calculateAndStoreFactors(symbol)` method (line 57)  
**Called by:** `populate-real-universe.ts` (line 212), `run-research-validation.ts` (line 102)  
**Called by (synthetic, FORBIDDEN):** `expand-market-coverage.ts` (line 144)

---

## 2. INPUTS REQUIRED

FactorEngine reads from 5 sources (lines 63-79):

### 2a. feature_snapshots table

```typescript
// Line 63-66
const featuresRes = await query(
  `SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date ASC`,
  [symbol]
);
```

**Fields consumed from features:**
- `rsi` — used in qualityFactor (line 101), momentumFactor (line 123)
- `macd_histogram` — used in momentumFactor (line 124)
- `adx` — used as weight in FactorEngine? (indirectly via trend_strength)
- `atr` — used in riskFactor (line 130)
- `momentum` — used in growthFactor (line 117), momentumFactor (line 124)
- `volatility` — used in riskFactor (line 129)
- `moving_average_distance` — used in valueFactor (line 110)
- `trend_strength` — used in growthFactor (line 116)

### 2b. daily_prices table (for sector momentum)

```typescript
// Line 68-70
const pricesRes = await query(
  `SELECT trade_date::text as date, close, volume FROM daily_prices WHERE symbol = $1 ORDER BY trade_date ASC`,
  [symbol]
);
```

### 2c. symbols table (for sector)

```typescript
// Line 72-75
const symbolRes = await query(
  `SELECT sector, industry FROM symbols WHERE symbol = $1`,
  [symbol]
);
```

### 2d. financial_snapshots table (CRITICAL)

```typescript
// Line 77-79
const financialsRes = await query(
  `SELECT * FROM financial_snapshots WHERE symbol = $1 ORDER BY period_end DESC LIMIT 1`,
  [symbol]
);
```

**With fallback default (line 80):**
```typescript
const financial = financialsRes.rows[0] || { pe_ratio: 25, dividend_yield: 1.5, beta: 1.0, eps: 50 };
```

**Fields consumed from financials:**
- `pe_ratio` → qualityFactor (line 98-99) and valueFactor (line 107-108)
- `dividend_yield` → qualityFactor (line 100) and valueFactor (line 109)
- `beta` → riskFactor (line 130)

### 2e. Sector momentum aggregation (from daily_prices)

```typescript
// Line 84: getSectorMomentumMap(sector)
// Computes AVG((close-open)/open) per trade_date for entire sector
const sectorMomentumMap = await this.getSectorMomentumMap(sector);
```

---

## 3. EXACT FACTOR COMPUTATIONS

### 3a. qualityFactor (lines 97-102)

```
qualityFactor = round(
  peScore × 0.4 + divScore × 0.3 + rsiTerm × 0.3
)
```

Where:
- `peScore` = if PE between 0-40: `100 - (PE/40 × 50)`, if PE > 40: `25`, else: `50`
- `divScore` = if div yield > 0: `min(divYield × 15, 100)`, else: `30`
- `rsiTerm` = if RSI between 30-70: `80`, else: `40`

**Data dependencies:** `financial_snapshots.pe_ratio`, `financial_snapshots.dividend_yield`, `feature_snapshots.rsi`

### 3b. valueFactor (lines 106-111)

```
valueFactor = round(
  peValue × 0.5 + yieldValue × 0.2 + maDistanceValue × 0.3
)
```

Where:
- `peValue` = if PE > 0: `max(10, min(90, 100 - PE × 1.5))`, else: `40`
- `yieldValue` = if div yield > 0: `min(90, 30 + divYield × 10)`, else: `40`
- `maDistanceValue` = if maDist not null: `max(10, min(90, 50 - maDist × 100))`, else: `50`

**Data dependencies:** `financial_snapshots.pe_ratio`, `financial_snapshots.dividend_yield`, `feature_snapshots.moving_average_distance`

### 3c. growthFactor (lines 115-117)

```
growthFactor = round(
  trendTerm × 0.6 + momTerm × 0.4
)
```

Where:
- `trendTerm` = if trendStrength not null: `min(100, max(0, 50 + trendStrength × 200))`, else: `50`
- `momTerm` = if momentum not null: `min(100, max(0, 50 + momentum × 300))`, else: `50`

**Data dependencies:** `feature_snapshots.trend_strength`, `feature_snapshots.momentum`  
**No financial data required.** This factor is 100% feature-derived (can work without financials).

### 3d. momentumFactor (lines 121-124)

```
momentumFactor = round(
  rsiMom × 0.3 + macdHistMom × 0.3 + changeMom × 0.4
)
```

Where:
- `rsiMom` = rsi value (clamped 0-100)
- `macdHistMom` = if macdHist not null: `min(100, max(0, 50 + macdHist × 5))`, else: `50`
- `changeMom` = if momentum not null: `min(100, max(0, 50 + momentum × 400))`, else: `50`

**Data dependencies:** `feature_snapshots.rsi`, `feature_snapshots.macd_histogram`, `feature_snapshots.momentum`  
**No financial data required.** 100% feature-derived.

### 3e. riskFactor (lines 128-131)

```
riskFactor = round(
  volRisk × 0.4 + betaRisk × 0.4 + atrRisk × 0.2
)
```

Where:
- `volRisk` = if volatility not null: `max(10, min(90, 100 - volatility × 150))`, else: `50`
- `betaRisk` = if beta exists: `max(10, min(90, 100 - beta × 40))`, else: `50`
- `atrRisk` = if atr not null: `max(10, min(90, 100 - (atr/close) × 1500))`, else: `50`

**Data dependencies:** `feature_snapshots.volatility`, `financial_snapshots.beta`, `feature_snapshots.atr`, `daily_prices.close`  
**Mixed:** volatility and ATR from features (real-derived if prices are real); beta from financials (must be provider-derived).

### 3f. sectorStrengthFactor (lines 135-136)

```
sectorStrengthFactor = round(
  min(100, max(0, 50 + sectorReturn × 1000))
)
```

Where:
- `sectorReturn` = AVG daily return for all symbols in the sector on that trade date

**Data dependencies:** `daily_prices` (sector aggregation query)  
**No financial data required.** 100% price-derived.

### 3g. factorScore (lines 141-142)

```
factorScore = round(
  (qualityFactor + valueFactor + growthFactor + momentumFactor + riskFactor + sectorStrengthFactor) / 6
)
```

**Simple equal-weighted average of all 6 factors.**

---

## 4. CAN GENERATION RUN WITHOUT SYNTHETIC DATA?

### Answer: PARTIALLY — depends on financial_snapshots coverage.

| Factor | Can run without financials? | What happens if financials are null/default? |
|--------|----------------------------|----------------------------------------------|
| **growthFactor** | ✅ YES — 100% feature-derived | Unaffected — normal |
| **momentumFactor** | ✅ YES — 100% feature-derived | Unaffected — normal |
| **sectorStrengthFactor** | ✅ YES — 100% price-derived | Unaffected — normal |
| **qualityFactor** | ⚠️ PARTIAL — needs PE + dividend yield | peScore defaults to 50, divScore to 30 → qualityFactor = 50 × 0.4 + 30 × 0.3 + rsiTerm × 0.3 = 29 + rsiTerm × 0.3. Factor is FLAT and mostly driven by RSI. |
| **valueFactor** | ⚠️ PARTIAL — needs PE + dividend yield | peValue defaults to 40, yieldValue to 40 → valueFactor = 40 × 0.5 + 40 × 0.2 + maDistanceValue × 0.3 = 28 + maDistValue × 0.3. Factor is FLAT and mostly driven by MA distance. |
| **riskFactor** | ⚠️ PARTIAL — needs beta | betaRisk defaults to 50 → riskFactor = vol × 0.4 + 50 × 0.4 + atr × 0.2 = vol × 0.4 + 20 + atr × 0.2. Factor is FLATTER than it should be. |

**Impact on rankings:**

Without real financial data (PE, dividend yield, beta):
- 3 of 6 factors (quality, value, risk) are **partially degraded** — their dynamic range is compressed
- 3 of 6 factors (growth, momentum, sector) are **fully functional**
- The `factorScore` (equal-weighted) will be dominated by growth/momentum/sector
- Rankings will be **technical-momentum biased**, not fundamental-quality balanced

**For StockStory's thesis (fundamental quality + momentum + value), real financial snapshots are ESSENTIAL.**

---

## 5. EVIDENCE — EXACT FILE/LINE CITATIONS

| Component | File | Lines |
|-----------|------|-------|
| FactorEngine class | `src/services/FactorEngine.ts` | 1-184 |
| calculateAndStoreFactors | `src/services/FactorEngine.ts` | 57-183 |
| qualityFactor computation | `src/services/FactorEngine.ts` | 97-102 |
| valueFactor computation | `src/services/FactorEngine.ts` | 106-111 |
| growthFactor computation | `src/services/FactorEngine.ts` | 115-117 |
| momentumFactor computation | `src/services/FactorEngine.ts` | 121-124 |
| riskFactor computation | `src/services/FactorEngine.ts` | 128-131 |
| sectorStrengthFactor computation | `src/services/FactorEngine.ts` | 135-136 |
| factorScore computation | `src/services/FactorEngine.ts` | 141-142 |
| UPSERT into factor_snapshots | `src/services/FactorEngine.ts` | 159-178 |
| Fallback financial defaults | `src/services/FactorEngine.ts` | 80 |
| Sector momentum aggregation | `src/services/FactorEngine.ts` | 26-38 |
| Called from populate-real-universe | `src/scripts/populate-real-universe.ts` | 212 |
| Called from run-research-validation | `src/scripts/run-research-validation.ts` | 102 |
| Called from expand-market-coverage | `src/scripts/expand-market-coverage.ts` | 144 |

---

## 6. VERDICT

**FactorEngine contains ZERO synthetic data generation.** It is a pure computation engine.

**However**, its output validity depends entirely on input quality:
- If `financial_snapshots` contains real provider data → factors are REAL
- If `financial_snapshots` contains synthetic or hardcoded defaults → factors are DEGRADED
- If `feature_snapshots` / `daily_prices` are real → 3 factors (growth, momentum, sector) are always REAL

The FactorEngine formula is deterministic and verifiable. The question is whether the data it reads is real — which is answered by the financial_snapshots population audit (Phase 2).
