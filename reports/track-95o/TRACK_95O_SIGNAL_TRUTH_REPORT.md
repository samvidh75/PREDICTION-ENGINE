# TRACK-95O — Signal Truth Report

**Date**: 6/8/2026
**Status**: IMPLEMENTED
**Scope**: Real Signal Activation Pipeline — replacing synthetic signals with prediction-registry-driven intelligence.

---

## 1. Signals Generated

### Classification Signals

| Signal Type | Trigger Condition | Severity |
|---|---|---|
| `classification_upgrade` | Classification tier increases (e.g., Healthy → Exceptional) | Critical (2+ tiers) / Important (1 tier) |
| `classification_downgrade` | Classification tier decreases | Critical (2+ tiers) / Important (1 tier) |

**Source**: `prediction_registry.classification` — today vs previous snapshot.
**Verification**: Rank-order comparison using `CLASSIFICATION_RANK` map (Exceptional=5, Critical=0).

### Confidence Signals

| Signal Type | Trigger Condition | Severity |
|---|---|---|
| `confidence_increase` | Confidence score increases ≥ 8 points | ≥15 pts = Critical, ≥8 pts = Important |
| `confidence_decrease` | Confidence score decreases ≥ 8 points | ≥15 pts = Critical, ≥8 pts = Important |

**Source**: `prediction_registry.confidence_score` — today vs previous snapshot.

### Factor Signals

| Signal Type | Trigger Condition | Severity |
|---|---|---|
| `factor_change` | Any factor delta (quality, growth, momentum, risk, value, sector) ≥ 10 points | Total ≥30 = Critical, ≥20 = Important, <20 = Monitor |

**Source**: `prediction_registry.{quality,growth,value,momentum,risk,sector}_score` — today vs previous snapshot.

### Ranking Signals

| Signal Type | Trigger Condition | Severity |
|---|---|---|
| `ranking_change` (entered) | Symbol enters Top 10 by ranking_score | Critical |
| `ranking_change` (left) | Symbol drops out of Top 10 | Important |

**Source**: Sorted ranking from today's vs previous snapshot's `prediction_registry.ranking_score`.

---

## 2. Validation

### Real prediction_registry Source
- ✅ All signals derived from `prediction_registry` table (migration 008).
- ✅ Only uses immutable append-only prediction records.
- ✅ Comparison is always today vs most recent previous snapshot date.

### Snapshot Dates Verified
- ✅ `snapshotDate` is today's date from `prediction_registry.prediction_date`.
- ✅ `previousDate` is the most recent `prediction_date` < today with data.
- ✅ No hardcoded dates.

### No Synthetic Events
- ✅ Zero fabricated signals.
- ✅ Zero pseudo scoring (no `calculateScore()` outside the prediction registry).
- ✅ Zero inferred upgrades (no guessing based on market data alone).
- ✅ When backend is unavailable: honest "unavailable" state, not fabricated signals.

### Explainability
- ✅ Every signal includes: `symbol`, `type`, `severity`, `previousValue`, `currentValue`, `delta`, `explanation`.
- ✅ Explanations follow the format: `{symbol} {change description} ({from} → {to})`.
- ✅ No opaque, generated, or templated signals without provenance.

---

## 3. Coverage

### Files Created/Modified

| File | Action | Description |
|---|---|---|
| `src/intelligence/PredictionDiffEngine.ts` | CREATED | Snapshot diff engine — core signal generation logic |
| `src/backend/web/routes/predictions/signals.ts` | CREATED | `GET /api/predictions/signals` endpoint |
| `src/backend/web/routes/index.ts` | MODIFIED | Registered predictions/signals route |
| `src/intelligence/index.ts` | MODIFIED | Exported PredictionDiffEngine from barrel |
| `src/intelligence/SignalFeedEngine.ts` | REWRITTEN | Consumes `/api/predictions/signals` instead of ops/health |
| `src/components/dashboard/DashboardHub.tsx` | REWRITTEN | Signals column fetches real signals instead of discovery rankings |
| `src/components/dashboard/AttentionCentre.tsx` | REWRITTEN | Consumes signals API; prioritizes by watchlist + severity |
| `src/components/dashboard/TodaysChangesPanel.tsx` | UPDATED | Compatible with new signal types; shows validation data inline |
| `reports/track-95o/TRACK_95O_SIGNAL_TRUTH_REPORT.md` | CREATED | This report |

### API Surface

```
GET /api/predictions/signals?limit=50&symbol=TCS&severity=critical
```

**Response shape**:
```json
{
  "signals": [
    {
      "symbol": "TCS",
      "type": "classification_upgrade",
      "severity": "critical",
      "previousValue": "Good",
      "currentValue": "Exceptional",
      "delta": "+2 tier(s)",
      "explanation": "TCS upgraded from Good → Exceptional",
      "snapshotDate": "2026-06-08",
      "validation": {
        "historicalSuccessRate": 68.4,
        "sampleSize": 312,
        "avgAlpha": 4.2
      }
    }
  ],
  "generatedAt": "2026-06-08T17:07:00.000Z",
  "snapshotDate": "2026-06-08",
  "symbolsAnalyzed": 124
}
```

### Dashboard Integration

- **DashboardHub**: Signals column now fetches `/api/predictions/signals?limit=20`. Shows Loading/Error/Empty/Data states.
- **AttentionCentre**: Fetches `/api/predictions/signals?limit=50`, prioritizes Watchlist+Critical > Watchlist+Important > Critical > Important > Monitor. Shows validation data inline.
- **TodaysChangesPanel**: Consumes `SignalFeedEngine.generateSignalFeed()` which fetches from signals API. Shows executive summary with counts. Shows validation data on each signal row.

### AttentionEngine Integration

The `AttentionEngine` (`src/intelligence/AttentionEngine.ts`) remains operational for its own use cases (user-specific watchlist/portfolio analysis with direct DB access). It is complementary — the dashboard components now use the PredictionDiffEngine pipeline for signal generation, which the AttentionEngine can also consume if needed.

---

## 4. Success Criteria Verification

| Criterion | Status | Evidence |
|---|---|---|
| 100% signal lineage traceable to prediction_registry | ✅ | `PredictionDiffEngine.fetchPredictions()` queries only `prediction_registry` |
| 0 synthetic signals | ✅ | No signal is generated without a real DB row for today's date |
| 0 pseudo scoring | ✅ | All scores come from `prediction_registry` columns, no computed fallbacks |
| 0 inferred upgrades | ✅ | Classification delta is a direct string comparison via CLASSIFICATION_RANK |
| Dashboard powered by real deltas | ✅ | DashboardHub fetches `/api/predictions/signals` |
| Attention Centre powered by real deltas | ✅ | AttentionCentre fetches `/api/predictions/signals` |
| Every signal explainable | ✅ | `explanation` field always includes symbol, direction, and exact values |
| Every signal historically measurable | ✅ | `SignalValidationEngine` hooks attach historical success rate, sample size, alpha |

---

## 5. Architecture Diagram

```
prediction_registry (today)
     │
     ├── PredictionDiffEngine.generateSignals()
     │       │
     │       ├── fetchPredictions(today)
     │       ├── fetchPredictions(previousDate)
     │       ├── computeDiff() → SymbolDiff[]
     │       ├── annotateRankingChanges()
     │       └── diffsToSignals() → IntelligenceSignal[]
     │
     ▼
GET /api/predictions/signals
     │
     ├── attachValidation() → SignalValidationEngine
     │       ├── validateClassificationChanges()
     │       ├── validateConfidenceChanges()
     │       └── validateFactorChanges()
     │
     ▼
DashboardHub ─────────── fetches /api/predictions/signals → renders signals column
AttentionCentre ──────── fetches /api/predictions/signals → renders priority feed
TodaysChangesPanel ───── fetches via SignalFeedEngine → renders detailed list
```

---

## 6. Key Decisions

1. **Horizon = 30**: All signals use `prediction_horizon = 30` for simplicity and because it's the most commonly populated horizon.
2. **Classification ranking**: Uses ordinal map (Exceptional=5, Critical=0) for correct comparison rather than alphabetical.
3. **Factor thresholds**: |delta| ≥ 10 to trigger a factor signal. This avoids noise from minor score fluctuations.
4. **Confidence threshold**: |delta| ≥ 8 to trigger a confidence signal.
5. **Validation best-effort**: If `SignalValidationEngine` queries fail, signals still return without validation data — the system degrades gracefully rather than failing.
6. **State machine intact**: All dashboard states (Loading, Error, Unavailable, Empty, Data) are preserved across all components.

---

## 7. Remaining Work (Not in Scope)

The following are intentionally not part of TRACK-95O:

- Broker integration (future track)
- Social features (future track)
- Portfolio automation (future track)
- Real-time WebSocket push of signals (current polling approach via fetch is adequate)
- Signal history/time-series (snapshots are compared live; no persistent signal storage yet)

---

## End of Report
