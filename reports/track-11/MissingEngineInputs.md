# Missing EngineInputs — TRACK-11

**Date:** 2026-06-06

---

## The Gap: EngineInputs vs Provider Output vs DB Schema

There are three separate contracts that don't fully align:

1. **Provider Output** — what Upstox/Screener/Finnhub return (`FinancialData`, untyped `Record<string, unknown>`)
2. **DB Schema** (`financial_snapshots` table) — what gets persisted
3. **EngineInputs.financials** — what the StockStory engine consumes

The route mapper (`src/backend/web/routes/intelligence.ts`, lines 838-854) is the bridge from DB columns → EngineInputs. It only maps fields it explicitly knows about.

---

## Fields Present in Provider Output But Missing from EngineInputs

### `roa`

| Source | Present? |
|--------|----------|
| UpstoxFundamentalsProvider returns it | YES (line 145: `roa,`) |
| ProviderCoordinator merge whitelist includes it | YES (line 203: `'roa'` in upstoxFields) |
| DB `financial_snapshots` column | **UNCERTAIN** — no evidence of `roa` column in SELECT queries |
| EngineInputs.financials type | NO |
| intelligence.ts mapper | NO |

**Missing mapping that should exist (hypothetical):**
```typescript
// In src/backend/web/routes/intelligence.ts, around line 848
roa: fin?.roa != null ? Number(fin.roa) : null,
```

**Missing type addition needed:**
```typescript
// In src/stockstory/types.ts, EngineInputs.financials interface
roa: number | null;  // add this line
```

---

### `bookValue`

| Source | Present? |
|--------|----------|
| ScreenerProvider returns it | YES (line 67: `bookValue: bookValue ?? undefined`) |
| ProviderCoordinator merge whitelist includes it | YES (line 219: `'bookValue'` in screenerEnrichmentFields) |
| DB `financial_snapshots` column | **UNCERTAIN** — no evidence in SELECT queries |
| EngineInputs.financials type | NO |
| intelligence.ts mapper | NO |

**Missing mapping that should exist (hypothetical):**
```typescript
// In src/backend/web/routes/intelligence.ts
bookValue: fin?.book_value != null ? Number(fin.book_value) : null,
```

**Missing type addition needed:**
```typescript
// In src/stockstory/types.ts, EngineInputs.financials interface
bookValue: number | null;  // add this line
```

---

## Fields Present in EngineInputs But Unused by Engines

### `eps`

| Engine | Uses `eps`? | How |
|--------|:-----------:|-----|
| GrowthEngine | NO | Uses `epsGrowth` (rate), not `eps` (absolute) |
| QualityEngine | NO | |
| StabilityEngine | NO | |
| MomentumEngine | NO | |
| ValuationEngine | NO | Uses `peRatio` (which includes EPS in denominator) |
| RiskEngine | NO | |
| AccountingEngine | NO | Uses `epsGrowth` (rate) |
| ConfidenceEngine | YES | Supplementary field, weight=1 in data completeness |

**Issue:** `eps` (absolute earnings per share) serves only as a data-presence signal for confidence. It has no scoring impact. This is partially acceptable — absolute EPS isn't comparable across companies — but it could be used by QualityEngine to detect negative earnings (already partially covered by negative PE check in RiskEngine).

---

### `dividendYield`

| Engine | Uses `dividendYield`? | How |
|--------|:---------------------:|-----|
| GrowthEngine | NO | |
| QualityEngine | NO | |
| StabilityEngine | NO | |
| MomentumEngine | NO | |
| ValuationEngine | NO | **Should use it** — classic yield/value metric |
| RiskEngine | NO | |
| AccountingEngine | NO | |
| ConfidenceEngine | YES | Supplementary field only |

**Issue:** `dividendYield` is collected from Screener and Finnhub, merged by ProviderCoordinator, mapped into EngineInputs, but **no scoring engine reads it**. It only contributes to data-completeness in ConfidenceEngine. This is the clearest case of "collected but never used" among the non-dead fields.

---

### `freeFloat`

| Engine | Uses `freeFloat`? | How |
|--------|:-----------------:|-----|
| All scoring engines | NO | |
| ConfidenceEngine | YES | Supplementary completeness field |

**Not surprising** — free float is a market microstructure metric with no direct scoring role. It's metadata, not a fundamental quality signal. Classification: **Correctly used as supplementary only.**

---

## Fields With Insufficient Engine Usage

### `marketCap`

| Engine | Uses `marketCap`? | How |
|--------|:----------------:|-----|
| RiskEngine | YES | Line 49: "negative PE with high market cap" anomaly check only |
| ConfidenceEngine | YES | Supplementary field |

**Current usage:** One narrow anomaly detection rule. **Missing:** No size-factor scoring. Larger market caps are empirically associated with lower volatility, higher liquidity, and better data quality — all of which could feed StabilityEngine or a standalone size factor. A marketCap-to-stability bridge would be high-impact.

---

### `beta`

| Engine | Uses `beta`? | How |
|--------|:-----------:|-----|
| RiskEngine | YES | Lines 90-94: amplifies volatilityRiskScore (beta > 2.0: +20pts, > 1.5: +10pts, < 0.5: -10pts) |
| ConfidenceEngine | YES | Supplementary completeness field |

**Current usage:** Beta only amplifies the existing volatility risk score — it's a modifier, not a standalone input. This is defensible design (beta and volatility are correlated), but beta could also feed StabilityEngine as a market-sensitivity metric.

---

## The Root Fix

To close the gap for the two dead fields (`roa`, `bookValue`), two changes are needed:

### Change 1: `src/stockstory/types.ts` (~line 70)
Add to `EngineInputs.financials`:
```typescript
roa: number | null;
bookValue: number | null;
```

### Change 2: `src/backend/web/routes/intelligence.ts` (~line 854)
Add to the `financials:` object literal:
```typescript
roa: fin?.roa != null ? Number(fin.roa) : null,
bookValue: fin?.book_value != null ? Number(fin.book_value) : null,
```

These two changes would bring `roa` and `bookValue` from dead → alive (present in EngineInputs). The engines would then need updates to consume them (see FieldToEngineMapping.md).

### DB Column Verification Note

The DB schema for `financial_snapshots` needs to be verified for `roa` and `book_value` columns. The current SELECT in `intelligence.ts` (line 420) reads `market_cap, pe_ratio, eps, dividend_yield, beta, free_float` but the StockStory route (line ~820) uses `SELECT *` which would capture any columns present. If the columns don't exist in the table, a migration would be needed.
