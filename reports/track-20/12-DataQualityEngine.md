# 12 — Data Quality Engine

**TRACK-20 Phase 5 — Task 13**
**Date:** 2026-06-06

---

## Purpose

The Data Quality Engine (DQE) validates all data entering the StockStory pipeline before it reaches the FactorEngine and ranking system. Bad data silently poisons rankings. The DQE catches it at the gate.

**What it detects:**
- NaN (Not a Number)
- Infinity (±Infinity)
- Null explosions (fields that should be populated but aren't)
- Stale snapshots (data older than expected freshness window)
- Outlier fundamentals (physically impossible values)
- Invalid factors (out of range 0-100, negative where impossible)

---

## Detection Rules

### 1. NaN Detection

```typescript
function hasNaN(record: Record<string, any>): string[] {
  const nanFields: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'number' && isNaN(value)) {
      nanFields.push(key);
    }
  }
  return nanFields;
}
```

**Severity:** 🔴 CRITICAL — NaN in any field invalidates that symbol's ranking.

**Action:** Log, flag symbol as `data_error`, exclude from ranking. Re-fetch on next pipeline run.

### 2. Infinity Detection

```typescript
function hasInfinity(record: Record<string, any>): string[] {
  const infFields: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'number' && !isFinite(value)) {
      infFields.push(key);
    }
  }
  return infFields;
}
```

**Common sources of Infinity:**
- Division by zero in derived metrics (e.g., `currentRatio = currentAssets / 0` → Infinity)
- Provider returning zero for a denominator field
- Integer overflow in API response

**Severity:** 🔴 CRITICAL — same as NaN.

### 3. Null Explosion Detection

When a provider returns data but critical fields are null, the symbol is not useful for ranking.

```typescript
function checkNullExplosion(financials: EngineInputs['financials']): boolean {
  const criticalFields = ['peRatio', 'roe', 'debtToEquity'];
  const nullCount = criticalFields.filter(f => financials[f] === null).length;
  
  if (nullCount === criticalFields.length) {
    // ALL critical fields are null — probably provider failure, not just missing data
    return true;
  }
  return false;
}
```

**Severity:** 🟡 MEDIUM — if all critical fields null, exclude from ranking. If some null, that's acceptable (derived metrics may fill gaps).

### 4. Stale Snapshot Detection

Financial snapshots should be refreshed quarterly. If a snapshot is > 180 days old, it's stale.

```typescript
function isStale(periodEnd: string, maxAgeDays: number = 180): boolean {
  const age = (Date.now() - new Date(periodEnd).getTime()) / (1000 * 60 * 60 * 24);
  return age > maxAgeDays;
}
```

**Severity:** 🟡 MEDIUM — stale data is still better than no data. Flag for review, use with reduced confidence.

### 5. Outlier Fundamentals

Physically impossible or extremely unlikely values:

| Field | Min | Max | Justification |
|-------|-----|-----|---------------|
| peRatio | 0.1 | 5000 | Negative PE = losses (valid). PE > 5000 is data error or penny stock. |
| pbRatio | 0.01 | 100 | Negative PB = negative equity (possible but rare). PB > 100 usually error. |
| roe | -5.0 | 5.0 | ROE > 500% is possible for highly leveraged companies but extremely rare. |
| roa | -1.0 | 1.0 | ROA > 100% impossible (net income cannot exceed total assets). |
| debtToEquity | -100 | 100 | D/E > 100 means equity near zero. Negative means negative equity. |
| grossMargin | -1.0 | 1.0 | Gross margin cannot exceed 100% or fall below -100%. |
| revenueGrowth | -1.0 | 50.0 | 5000% revenue growth is usually a data error. |
| currentRatio | 0.01 | 100 | CR > 100 means massive cash hoard or near-zero current liabilities. |
| marketCap | 1e6 | 1e14 | ₹10 lakh minimum to ₹100 lakh crore max (Tata-level). |

```typescript
function isOutlier(field: string, value: number): boolean {
  const ranges: Record<string, [number, number]> = {
    peRatio: [0.1, 5000],
    pbRatio: [0.01, 100],
    roe: [-5, 5],
    roa: [-1, 1],
    debtToEquity: [-100, 100],
    grossMargin: [-1, 1],
    operatingMargin: [-1, 1],
    revenueGrowth: [-1, 50],
    profitGrowth: [-1, 50],
    currentRatio: [0.01, 100],
    marketCap: [1e6, 1e14],
    evEbitda: [0.1, 5000],
    beta: [-5, 5],
    dividendYield: [0, 0.50], // 50% yield is absurd
  };

  const [min, max] = ranges[field] ?? [-Infinity, Infinity];
  return value < min || value > max;
}
```

**Severity:** 🟡 MEDIUM — flag the field, replace with null, let derived metrics fill if possible.

### 6. Invalid Factor Scores

FactorEngine should produce values in 0-100 range. Anything outside is an engine bug.

```typescript
function isInvalidFactor(factorName: string, value: number): boolean {
  if (value < 0 || value > 100) return true;
  if (!isFinite(value)) return true;
  if (isNaN(value)) return true;
  return false;
}
```

**Severity:** 🔴 CRITICAL — indicates FactorEngine bug. Exclude symbol from ranking.

---

## DQE Validation Pipeline

```
Raw Data → Stage 0: Schema Validation
              ↓
           Stage 1: NaN Scan
              ↓
           Stage 2: Infinity Scan
              ↓
           Stage 3: Null Explosion Check
              ↓
           Stage 4: Staleness Check
              ↓
           Stage 5: Outlier Detection
              ↓
           Stage 6: Factor Range Check
              ↓
         Clean Data → Write to DB
```

---

## Validation Output

```typescript
interface DQEValidationResult {
  symbol: string;
  passed: boolean;
  issues: DQEIssue[];
  severity: 'clean' | 'warning' | 'error' | 'critical';
}

interface DQEIssue {
  stage: string;
  field: string;
  value: any;
  issue: string;
  severity: 'warning' | 'error' | 'critical';
  action: 'flag' | 'replace_with_null' | 'exclude_symbol' | 'abort_pipeline';
}

// Example output:
// {
//   symbol: "TATASTEEL",
//   passed: false,
//   issues: [
//     { stage: "NaN", field: "peRatio", value: NaN, issue: "NaN in peRatio", severity: "critical", action: "exclude_symbol" }
//   ],
//   severity: "critical"
// }
```

---

## Integration with Nightly Pipeline

DQE runs as Stage 9 of the nightly pipeline (Task 10):

```
After all symbols computed, before DB write:
  1. Run DQE on each symbol's financials, features, factors
  2. Symbols with CRITICAL issues → exclude from DB write, add to error report
  3. Symbols with ERROR issues → write to DB with error flag, reduced confidence
  4. Symbols with WARNING issues → write to DB with warning flag, normal confidence
  5. If > 5% of symbols have CRITICAL issues → ABORT pipeline (data source problem)
```

---

## Run Report

After data quality validation, produce:

```
DQE Report — 2026-06-07 Nightly
────────────────────────────────
Total symbols checked: 503
Clean: 487 (96.8%)
Warnings: 12 (2.4%) — minor outliers, stale snapshots
Errors: 3 (0.6%) — null explosions resolved by derived metrics
Critical: 1 (0.2%) — NaN in INFOSOLAR.peRatio (provider returned zero denominator)
Excluded: 1 (INFOSOLAR — critical NaN)

Pipeline VERDICT: PASS (99.8% clean rate)
```

---

**TRACK-20 Data Quality Engine — Phase 5 TASK 13 Complete**
