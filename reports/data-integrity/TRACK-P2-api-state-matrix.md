# TRACK-P2 — API State Matrix

**Date:** 2026-06-09

Each endpoint's response shapes for every applicable state.

---

## 1. `/api/stockstory/:ticker`

### Real (prediction exists)
HTTP 200
```json
{
  "status": "ok",
  "mode": "production_real",
  "data": {
    "ticker": "RELIANCE",
    "scoreSummary": { ... },
    "engines": { ... }
  },
  "reason": "StockStory generated from prediction snapshot.",
  "message": null,
  "generatedAt": "2026-06-09T...",
  "dataState": {
    "availability": "available",
    "freshness": "recent",
    "asOf": "2026-06-08",
    "missingInputs": [],
    "neutralizedFields": [],
    "completenessScore": 100,
    "lineage": [{
      "sourceTable": "prediction_registry",
      "asOf": "2026-06-08",
      "isFallback": false,
      "isSynthetic": false
    }]
  }
}
```

### Unavailable (no snapshot)
HTTP 200
```json
{
  "status": "unavailable",
  "mode": "production_unavailable",
  "data": null,
  "reason": "PREDICTION_NOT_FOUND",
  "message": "StockStory data is unavailable for RELIANCE. The prediction snapshot has not been generated.",
  "generatedAt": "2026-06-09T...",
  "dataState": {
    "availability": "unavailable",
    "freshness": "unknown",
    "asOf": null,
    "missingInputs": ["prediction_registry"],
    "neutralizedFields": [],
    "completenessScore": 0,
    "lineage": []
  }
}
```

### Error (database unavailable)
HTTP 200
```json
{
  "status": "error",
  "mode": "production_unavailable",
  "data": null,
  "reason": "DATABASE_UNAVAILABLE",
  "message": "The analytical database is temporarily unavailable.",
  "generatedAt": "2026-06-09T..."
}
```

---

## 2. `/api/intelligence/company/:symbol`

### Real (both snapshots present)
HTTP 200
```json
{
  "status": "ok",
  "mode": "production_real",
  "data": {
    "symbol": "RELIANCE",
    "featureSnapshot": { ... },
    "factorSnapshot": { ... },
    "insights": { ... },
    "narrative": { ... }
  },
  "reason": "Company intelligence generated from feature and factor snapshots.",
  "message": null,
  "generatedAt": "2026-06-09T...",
  "dataState": {
    "availability": "available",
    "freshness": "recent",
    "asOf": "2026-06-08",
    "missingInputs": [],
    "neutralizedFields": [],
    "completenessScore": 100,
    "lineage": [
      { "sourceTable": "feature_snapshots", "asOf": "2026-06-08", "isFallback": false, "isSynthetic": false },
      { "sourceTable": "factor_snapshots", "asOf": "2026-06-08", "isFallback": false, "isSynthetic": false }
    ]
  }
}
```

### Unavailable (both snapshots missing)
HTTP 200
```json
{
  "status": "unavailable",
  "mode": "production_unavailable",
  "data": {
    "symbol": "RELIANCE",
    "feature_snapshots": false,
    "factor_snapshots": false
  },
  "reason": "FEATURE_OR_FACTOR_SNAPSHOT_MISSING",
  "message": "Company intelligence is unavailable because required market snapshots have not been generated.",
  "generatedAt": "2026-06-09T...",
  "dataState": {
    "availability": "unavailable",
    "freshness": "unknown",
    "asOf": null,
    "missingInputs": ["feature_snapshots", "factor_snapshots"],
    "neutralizedFields": [],
    "completenessScore": 0,
    "lineage": []
  }
}
```

### Partial (one snapshot missing)
HTTP 200
```json
{
  "status": "partial",
  "mode": "production_partial",
  "data": {
    "symbol": "RELIANCE",
    "featureSnapshot": { ... }
  },
  "reason": "FACTOR_SNAPSHOT_MISSING",
  "message": "Company intelligence is partially available. Missing: factor_analysis.",
  "availableSections": ["feature_analysis"],
  "unavailableSections": ["factor_analysis"],
  "generatedAt": "2026-06-09T...",
  "dataState": {
    "availability": "partial",
    "freshness": "recent",
    "asOf": "2026-06-08",
    "missingInputs": ["factor_snapshots"],
    "neutralizedFields": [],
    "completenessScore": 50,
    "lineage": [
      { "sourceTable": "feature_snapshots", "asOf": "2026-06-08", "isFallback": false, "isSynthetic": false }
    ]
  }
}
```

### Error (database unavailable)
HTTP 200
```json
{
  "status": "error",
  "mode": "production_unavailable",
  "data": null,
  "reason": "DATABASE_UNAVAILABLE",
  "message": "The database is currently unreachable.",
  "generatedAt": "2026-06-09T..."
}
```

---

## 3. `/api/intelligence/portfolio` (GET)

### Real (positions provided)
HTTP 200
```json
{
  "status": "ok",
  "mode": "production_real",
  "data": {
    "intelligence": { ... },
    "holdingsCount": 5,
    "rejectedPositions": [],
    "neutralizedFields": ["sector_strength_factor"]
  },
  "reason": "Portfolio intelligence generated from validated positions.",
  "generatedAt": "2026-06-09T...",
  "dataState": {
    "availability": "available",
    "freshness": "recent",
    "asOf": "2026-06-09",
    "completenessScore": 85,
    "lineage": [...]
  }
}
```

### Empty (no positions)
HTTP 200
```json
{
  "status": "empty",
  "mode": "production_real",
  "data": null,
  "reason": "EMPTY_PORTFOLIO",
  "message": "No portfolio positions were supplied.",
  "generatedAt": "2026-06-09T...",
  "dataState": {
    "availability": "available",
    "freshness": "recent",
    "asOf": "2026-06-09",
    "completenessScore": 100,
    "lineage": [...]
  }
}
```

### Demo (explicit ?mode=demo)
HTTP 200
```json
{
  "status": "demo",
  "mode": "demo",
  "data": {
    "intelligence": { ... },
    "neutralizedFields": [],
    "completenessScore": 100,
    "isDemo": true,
    "positions": [
      { "symbol": "RELIANCE", "weight": 0.25, "_demo": true },
      { "symbol": "TCS", "weight": 0.20, "_demo": true },
      { "symbol": "INFY", "weight": 0.20, "_demo": true },
      { "symbol": "HDFCBANK", "weight": 0.20, "_demo": true },
      { "symbol": "HAL", "weight": 0.15, "_demo": true }
    ]
  },
  "reason": "DEMO_MODE",
  "message": "Demo portfolio intelligence with sample holdings.",
  "generatedAt": "2026-06-09T..."
}
```

---

## 4. `/api/intelligence/portfolio` (POST)

Same states as GET. Additional:

### All Positions Rejected
HTTP 200
```json
{
  "status": "empty",
  "mode": "production_real",
  "data": null,
  "reason": "ALL_POSITIONS_REJECTED",
  "message": "All 3 positions were rejected.",
  "rejectedPositions": [
    { "symbol": "(empty)", "reason": "Empty symbol" },
    { "symbol": "XYZ", "reason": "Invalid weight: abc" },
    { "symbol": "ABC", "reason": "Invalid weight: -0.5" }
  ],
  "dataState": { ... }
}
```

---

## 5. `/api/intelligence/market`

### Real
HTTP 200
```json
{
  "status": "ok",
  "mode": "production_real",
  "data": {
    "marketMood": { ... },
    "marketBreadth": 0.65,
    "riskAppetite": { ... },
    "leadershipTrends": [...]
  },
  "reason": "Market intelligence generated from aggregate feature and factor snapshots.",
  "generatedAt": "2026-06-09T...",
  "dataState": {
    "availability": "available",
    "freshness": "recent",
    "asOf": "2026-06-08",
    "completenessScore": 100,
    "lineage": [
      { "sourceTable": "feature_snapshots", ... },
      { "sourceTable": "factor_snapshots", ... }
    ]
  }
}
```

### Error
HTTP 200
```json
{
  "status": "error",
  "mode": "production_unavailable",
  "data": null,
  "reason": "DATABASE_UNAVAILABLE",
  "message": "The database is currently unreachable.",
  "generatedAt": "2026-06-09T..."
}
```

---

## 6. `/api/intelligence/insight/:symbol`

### Real
HTTP 200
```json
{
  "status": "ok",
  "mode": "production_real",
  "data": {
    "title": "...",
    "summary": "...",
    "coverage": "Feature snapshot from 2026-06-08, Factor snapshot from 2026-06-08",
    "freshness": "Data as of 2026-06-08",
    "dataQuality": "Source: feature_snapshots (2026-06-08), factor_snapshots (2026-06-08)"
  },
  "reason": "Insight derived from feature and factor snapshot data.",
  "dataState": {
    "availability": "available",
    "freshness": "recent",
    "asOf": "2026-06-08",
    "completenessScore": 100,
    "lineage": [...]
  }
}
```

### Unavailable (no snapshots)
HTTP 200
```json
{
  "status": "unavailable",
  "mode": "production_unavailable",
  "data": { "symbol": "RELIANCE" },
  "reason": "FEATURE_OR_FACTOR_SNAPSHOT_MISSING",
  "message": "Insight generation requires both feature and factor snapshots, which are not available for this symbol.",
  "dataState": {
    "availability": "unavailable",
    "freshness": "unknown",
    "asOf": null,
    "missingInputs": ["feature_snapshots", "factor_snapshots"],
    "completenessScore": 0,
    "lineage": []
  }
}
```

---

## 7. `/api/intelligence/signals`

### Real (signals exist)
HTTP 200
```json
{
  "status": "ok",
  "mode": "production_real",
  "data": {
    "signals": [{ ... }, { ... }],
    "summary": { ... },
    "snapshotDate": "2026-06-08",
    "symbolsAnalyzed": 150
  },
  "reason": "Signal feed derived from prediction registry snapshot diffs.",
  "dataState": {
    "availability": "available",
    "freshness": "recent",
    "asOf": "2026-06-08",
    "completenessScore": 100,
    "lineage": [{
      "sourceTable": "prediction_registry",
      "isFallback": false,
      "isSynthetic": false
    }]
  }
}
```

### Empty (no significant signals)
HTTP 200
```json
{
  "status": "empty",
  "mode": "production_real",
  "data": null,
  "reason": "NO_SIGNIFICANT_SIGNALS",
  "message": "No significant prediction changes were detected in the current snapshot window.",
  "dataState": {
    "availability": "available",
    "freshness": "recent",
    "asOf": "2026-06-09",
    "completenessScore": 100,
    "lineage": [{ "sourceTable": "prediction_registry", "isFallback": false, "isSynthetic": false }]
  }
}
```

### Unavailable (no snapshots)
HTTP 200
```json
{
  "status": "unavailable",
  "mode": "production_unavailable",
  "data": { "dataSource": "unavailable" },
  "reason": "SNAPSHOT_NOT_GENERATED",
  "message": "Signals cannot be generated because prediction snapshots are not available. Try running the prediction pipeline first.",
  "dataState": {
    "availability": "unavailable",
    "freshness": "unknown",
    "asOf": null,
    "missingInputs": ["prediction_registry"],
    "completenessScore": 0,
    "lineage": []
  }
}
```

---

## 8. `/api/predictions/signals`

Same states as `/api/intelligence/signals`.

---

## 9. `/api/predictions/explain/:symbol`

### Real
HTTP 200
```json
{
  "status": "ok",
  "mode": "production_real",
  "data": {
    "symbol": "RELIANCE",
    "explanation": { ... }
  },
  "reason": "Explanation generated from prediction and snapshot data.",
  "dataState": {
    "availability": "available",
    "freshness": "recent",
    "asOf": "2026-06-08",
    "completenessScore": 100,
    "lineage": [
      { "sourceTable": "prediction_registry", ... },
      { "sourceTable": "feature_snapshots", ... }
    ]
  }
}
```

### Unavailable (no snapshots)
HTTP 200
```json
{
  "status": "unavailable",
  "mode": "production_unavailable",
  "data": null,
  "reason": "PREDICTION_NOT_FOUND",
  "message": "No prediction or snapshot data found for this symbol.",
  "dataState": {
    "availability": "unavailable",
    "freshness": "unknown",
    "missingInputs": ["prediction_registry", "feature_snapshots"],
    "completenessScore": 0,
    "lineage": []
  }
}
```

### Error
HTTP 200
```json
{
  "status": "error",
  "mode": "production_unavailable",
  "data": null,
  "reason": "DATABASE_UNAVAILABLE",
  "message": "The database is currently unreachable.",
  "generatedAt": "2026-06-09T..."
}
```

---

## Summary

All 9 endpoints now consistently return the `AnalyticalResponse<T>` envelope with `status`, `mode`, `dataState` containing `availability`, `freshness`, `asOf`, `missingInputs`, `neutralizedFields`, `completenessScore`, and `lineage`.

- **Real**: `status=ok`, `mode=production_real`, data present
- **Partial**: `status=partial`, `mode=production_partial`, some inputs missing
- **Empty**: `status=empty`, valid but zero results (NO_SIGNIFICANT_SIGNALS, EMPTY_PORTFOLIO)
- **Unavailable**: `status=unavailable`, `mode=production_unavailable`, data=null, reason explains why
- **Demo**: `status=demo`, `mode=demo`, `isDemo: true` in data
- **Error**: `status=error`, `mode=production_unavailable`, system error reason

No endpoint returns synthetic analysis, fabricated claims, or silent defaults.
