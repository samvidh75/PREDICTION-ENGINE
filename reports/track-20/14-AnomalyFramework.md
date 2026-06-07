# 14 — Anomaly Detection Framework

**TRACK-20 Phase 5 — Task 15**
**Date:** 2026-06-06

---

## Purpose

Detect anomalies in financial data that signal either data quality issues or genuine fundamental changes that users should know about. An anomaly is NOT automatically an error — it might be real (e.g., a company's PE doubling because earnings halved). But it MUST be flagged for review.

---

## Anomaly Categories

### 1. Sudden PE Jumps

PE ratio increases/decreases by > 3× between snapshots.

**Cause:** Usually earnings collapse or recovery, not a data error.

```typescript
function detectPeJump(
  currentPE: number,
  previousPE: number,
): { anomaly: boolean; direction: 'up' | 'down'; factor: number } | null {
  if (!currentPE || !previousPE) return null;
  
  const ratio = currentPE / previousPE;
  if (ratio > 3) {
    return { anomaly: true, direction: 'up', factor: ratio };
  }
  if (ratio < 0.33) {
    return { anomaly: true, direction: 'down', factor: ratio };
  }
  return null;
}
```

**Example:** TATASTEEL PE goes from 8.5 → 45.2 in one quarter. Flag: "PE increased 5.3× — possible earnings collapse. Verify net income."

**Severity:** 🟡 MEDIUM — flag for review, don't exclude from ranking.

### 2. Revenue Collapse / Spike

Revenue change > 50% quarter-over-quarter or > 200% year-over-year.

```typescript
function detectRevenueAnomaly(
  currentRevenue: number,
  previousRevenue: number,
  isQuarterly: boolean = true,
): { anomaly: boolean; change: number; direction: string } | null {
  if (!currentRevenue || !previousRevenue) return null;
  
  const change = (currentRevenue - previousRevenue) / Math.abs(previousRevenue);
  const threshold = isQuarterly ? 0.50 : 2.0; // 50% QoQ or 200% YoY
  
  if (Math.abs(change) > threshold) {
    return {
      anomaly: true,
      change,
      direction: change > 0 ? 'surge' : 'collapse',
    };
  }
  return null;
}
```

**Severity:** 🔴 HIGH — could indicate data error (wrong reporting currency, duplicate quarter) or genuine event (merger, divestiture).

### 3. Factor Score Spikes

Any factor changes by > 30 points between pipeline runs.

```typescript
function detectFactorSpike(
  currentFactor: number,
  previousFactor: number,
): boolean {
  return Math.abs(currentFactor - previousFactor) > 30;
}
```

**Cause:** Usually a data change — new financials ingested, large price move, or provider data correction. Rarely a bug.

**Severity:** 🟡 MEDIUM — flag the factor as "Unstable" in ranking output.

### 4. Technical Anomalies

#### 4a. Zero Volume

```typescript
function detectZeroVolume(volumes: number[], days: number = 5): boolean {
  return volumes.slice(-days).every(v => v === 0);
}
```

If 5 consecutive days have zero volume → stock may be delisted, suspended, or data error.

**Severity:** 🟡 MEDIUM — verify listing status.

#### 4b. Flatline Price

```typescript
function detectFlatline(closes: number[], days: number = 10): boolean {
  const unique = new Set(closes.slice(-days));
  return unique.size <= 2; // Only 1-2 unique prices in 10 days
}
```

**Severity:** 🟡 MEDIUM — possible suspension, illiquidity, or data error.

#### 4c. Gap Up/Down

```typescript
function detectGap(
  prevClose: number,
  currentOpen: number,
  threshold: number = 0.10, // 10%
): { anomaly: boolean; gap: number; direction: string } | null {
  if (!prevClose || !currentOpen) return null;
  
  const gap = (currentOpen - prevClose) / prevClose;
  if (Math.abs(gap) > threshold) {
    return {
      anomaly: true,
      gap,
      direction: gap > 0 ? 'gap_up' : 'gap_down',
    };
  }
  return null;
}
```

**Severity:** 🟢 LOW — usually a real event (earnings, dividend, news). Flag for user awareness.

### 5. Cross-Field Consistency Checks

Fields that should have consistent relationships:

```typescript
function consistencyChecks(financials: Record<string, number | null>): string[] {
  const warnings: string[] = [];
  
  // PE should be consistent with EPS and Price
  if (financials.peRatio && financials.eps && financials.eps > 0) {
    const impliedPrice = financials.peRatio * financials.eps;
    // Price * EPS should approximate market cap / shares
    // Rough check — not exact due to rounding
  }
  
  // ROE should be >= ROA (leverage amplifies ROE)
  if (financials.roe !== null && financials.roa !== null) {
    if (financials.roe < financials.roa && financials.roa > 0) {
      warnings.push('ROE < ROA — unusual for leveraged company (possible data issue)');
    }
  }
  
  // Gross margin should logically precede operating margin
  if (financials.grossMargin !== null && financials.operatingMargin !== null) {
    if (financials.operatingMargin > financials.grossMargin) {
      warnings.push('Operating margin > Gross margin — unusual (possible classification difference)');
    }
  }
  
  // Debt to Equity sign consistency
  if (financials.debtToEquity !== null) {
    if (financials.debtToEquity < 0 && financials.peRatio && financials.peRatio > 0) {
      warnings.push('Negative D/E with positive PE — verify equity status');
    }
  }
  
  return warnings;
}
```

---

## Anomaly Scoring

Each detected anomaly contributes to an anomaly score:

```typescript
interface DetectedAnomaly {
  type: string;
  field: string;
  currentValue: number;
  previousValue: number | null;
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: string;
}

function computeAnomalyScore(anomalies: DetectedAnomaly[]): number {
  const weights = { low: 1, medium: 3, high: 10 };
  return anomalies.reduce((sum, a) => sum + weights[a.severity], 0);
}

// Anomaly Score Thresholds:
// 0       → Clean — no anomalies
// 1-5     → Minor — low-severity only, informational
// 6-15    → Moderate — medium-severity detected, requires review
// 16+     → Severe — high-severity or many anomalies, likely data issue
```

---

## Anomaly Handling

### In the Pipeline

```
DQE validation
  ↓
Anomaly detection
  ↓
│ if anomalyScore === 0 → write to DB normally
│ if anomalyScore 1-5 → write with 'anomaly_flag', normal confidence
│ if anomalyScore 6-15 → write with 'anomaly_review', reduce confidence by 10
│ if anomalyScore 16+ → exclude from ranking, add to review queue
```

### In the UI

| Anomaly Score | Badge | User Message |
|--------------|-------|-------------|
| 0 | ✅ Clean | No anomalies detected |
| 1-5 | ⚠️ Minor | "{n} minor data anomalies detected. Ranking may be slightly affected." |
| 6-15 | 🔶 Review | "Significant data anomalies. Verify {field1}, {field2} before relying on ranking." |
| 16+ | 🔴 Alert | "Severe anomalies detected. This stock's ranking has been excluded pending review." |

---

## Historical Anomaly Tracking

Store anomalies in DB for trend analysis:

```sql
CREATE TABLE data_anomalies (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  run_date DATE NOT NULL,
  anomaly_type VARCHAR(50) NOT NULL,
  field VARCHAR(50),
  current_value NUMERIC,
  previous_value NUMERIC,
  severity VARCHAR(10) NOT NULL,
  description TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anomalies_symbol_date ON data_anomalies (symbol, run_date DESC);
```

If a stock has anomalies on 3+ consecutive runs → escalate for manual review.

---

## Anomaly Report Example

```
Anomaly Detection Report — 2026-06-07 Nightly
──────────────────────────────────────────────
Symbols scanned: 503
Anomalies detected: 8 (across 6 symbols)

🔴 HIGH:
  INDOSOLAR — Revenue surge +350% QoQ (possible data error or merger)
  WOCKPHARM — PE jumped 6.2× (85 → 530) — verify earnings change

🟡 MEDIUM:
  YESBANK — ROE < ROA inconsistency (high leverage but negative ROA)
  TRIDENT — Operating margin > Gross margin (0.22 > 0.18)
  SUZLON — Factor spike: momentum +34 points (large price move)
  ADANIGREEN — Flatline price for 7 days (check suspension)

🟢 LOW:
  TCS — Gap down 3.2% (post-dividend adjustment, normal)
  INFY — Gap up 2.8% (earnings beat, normal)

Symbols excluded from ranking: 1 (INDOSOLAR — revenue anomaly pending review)
```

---

**TRACK-20 Anomaly Framework — Phase 5 TASK 15 Complete**
