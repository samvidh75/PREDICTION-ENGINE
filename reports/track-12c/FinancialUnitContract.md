# Track-12C: Financial Unit Contract

**Date:** 2026-06-14  
**Purpose:** Document the exact unit, range, and null semantics for every audited financial field across all active production scoring paths.

---

## 1. Unit Contract Table

| Field | DB Column Type | Source Unit | Normalized Unit | Normalized Range | Nullable | String parsing needed? | Production conversion |
|-------|---------------|-------------|-----------------|------------------|----------|----------------------|----------------------|
| `roa` | `NUMERIC(8,4)` | Fraction (0.10 = 10%) | Fraction — unchanged | Typically -0.50 to 0.50 | YES | NO | `Number(fin.roa)` — no `/100` |
| `roe` | `NUMERIC(8,4)` | Fraction (0.18 = 18%) | Fraction — unchanged | Typically -1.0 to 1.0 | YES | NO | `Number(fin.roe)` |
| `roic` | `NUMERIC(8,4)` | Fraction (0.14 = 14%) | Fraction — unchanged | Typically -0.50 to 0.50 | YES | NO | `Number(fin.roic)` |
| `dividendYield` | `REAL` | Fraction (0.04 = 4%) | Fraction — unchanged | Typically 0 to 0.50 | YES | NO | `Number(fin.dividend_yield)` |
| `marketCap` | `REAL` | INR crores (50000 = ₹50,000 Cr) | INR crores — unchanged | 10 to 10⁷+ Cr | YES | NO | `Number(fin.market_cap)` |
| `operatingMargin` | `NUMERIC(8,4)` | Fraction (0.20 = 20%) | Fraction — unchanged | Typically -0.50 to 0.80 | YES | NO | `Number(fin.operating_margin)` |
| `grossMargin` | `NUMERIC(8,4)` | Fraction (0.50 = 50%) | Fraction — unchanged | Typically -0.50 to 0.90 | YES | NO | `Number(fin.gross_margin)` |
| `fcfYield` | `NUMERIC(8,4)` | Fraction (0.04 = 4%) | Fraction — unchanged | Typically -0.10 to 0.15 | YES | NO | `Number(fin.fcf_yield)` |
| `debtToEquity` | `NUMERIC(8,4)` | Ratio (0.4 = 0.4x) | Ratio — unchanged | 0 to 10+ | YES | NO | `Number(fin.debt_to_equity)` |
| `currentRatio` | `NUMERIC(8,4)` | Ratio (1.8 = 1.8x) | Ratio — unchanged | 0 to 5+ | YES | NO | `Number(fin.current_ratio)` |
| `evEbitda` | `NUMERIC(8,4)` | Multiple (15 = 15x) | Multiple — unchanged | -20 to 100+ | YES | NO | `Number(fin.ev_ebitda)` |
| `peRatio` | `NUMERIC(8,4)` | Multiple (18 = 18x) | Multiple — unchanged | -50 to 200+ | YES | NO | `Number(fin.pe_ratio)` |
| `pbRatio` | `NUMERIC(8,4)` | Multiple (3 = 3x) | Multiple — unchanged | -10 to 50+ | YES | NO | `Number(fin.pb_ratio)` |

---

## 2. Source-Specific Notes

### 2.1 ROA, ROE, ROIC
- Stored as fractions in DB (0.10 = 10%)
- QualityEngine static thresholds expect fractions: `if (roa >= 0.15)` = 15% ROA
- **No evidence of percentage values** from any provider — no `/100` conversion needed
- Range confirmed by sector distribution data: p10–p90 typically -0.05 to 0.30

### 2.2 Dividend Yield
- Stored as fraction (0.04 = 4%)
- ValuationEngine value-trap thresholds expect fractions: `if (divYield >= 0.20)` = 20% yield
- **No evidence of percentage values** from any provider — no `/100` conversion needed
- Yield above 0.20 (20%) is rare and signals distress
- Provider yfinance returns dividend yield as a decimal (e.g., 0.035 for 3.5%)

### 2.3 Market Cap
- Stored as INR crores (50000 = ₹50,000 Cr = ₹50 billion)
- StabilityEngine log10 expects crores: `const mcapCr = financials.marketCap` then `Math.log10(mcapCr)`
- **No crore→INR conversion needed** in PredictionFactory
- `generate-deliverables.ts:41` has `marketCapInr / 100_000_00` — **this is a bug**: the source is already in crores, dividing by 100_000_00 would destroy the value. But this path only affects F1 batch script, not daily pipeline.

### 2.4 Margin Fields (grossMargin, operatingMargin)
- Stored as fractions (0.50 = 50%)
- SectorAdapter thresholds expect fractions: `gmPremium: 0.80` = 80% gross margin
- Banking/Insurance: `useGrossMargin = false`, gross margin is not scored

### 2.5 Ratios (debtToEquity, currentRatio)
- Stored as dimensionless ratios
- Debt-to-equity below 0 = rare but handled (score 95)
- Current ratio below 0.5 = severe distress (score 10)

---

## 3. Normalization Rules

### 3.1 Default for all fields
```
value = dbValue !== null && dbValue !== undefined && dbValue !== ''
  ? Number(dbValue)
  : null
```

### 3.2 Sanitization required
- `Number()` can produce `NaN` or `±Infinity` from malformed strings
- **Current code does NOT sanitize** — NaN can reach engine scoring logic
- **Fix needed**: Add finite-number check: `isFinite(value)` after Number()

### 3.3 No silent division by 100
- All values are confirmed to be in fraction/ratio form at source
- Adding `/ 100` would erroneously divide already-correct values by 100
- Only exception: `generate-deliverables.ts` which has a buggy `/ 100_000_00` for market cap

---

## 4. Source Provider Unit Evidence

| Provider | ROA Unit | Div Yield Unit | Market Cap Unit | Evidence |
|----------|----------|---------------|-----------------|----------|
| yfinance | Decimal (0.10) | Decimal (0.04) | USD or INR | `returnOnAssets`, `dividendYield` fields return decimals |
| Screener | Decimal (0.10) | Decimal (0.04) | INR crores | Screener API returns fractions |
| Internal ingestion | Fraction | Fraction | INR crores | `financial_snapshots` schema + migration scripts |
