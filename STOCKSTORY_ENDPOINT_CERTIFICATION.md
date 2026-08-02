# STOCKSTORY ENDPOINT CERTIFICATION

## Scope

Endpoint certified:

`GET /api/stockstory/:ticker`

Implemented route:

`src/backend/web/routes/stockstory.ts`

Registered by:

`src/backend/web/routes/index.ts`

Source of truth:

`prediction_registry` only.

No generated values, seeded values, factor snapshot fallback, financial snapshot fallback, or fallback scores are used by the production `/api/stockstory/:ticker` route.

## Response Contract

```json
{
  "symbol": "RELIANCE",
  "companyName": null,
  "healthScore": 12,
  "classification": "At Risk",
  "confidence": {
    "score": 30,
    "level": "Low",
    "source": "prediction_registry.confidence_score",
    "snapshotDate": "2026-06-08"
  },
  "factors": {
    "quality": {
      "score": 51,
      "source": "prediction_registry.quality_score",
      "snapshotDate": "2026-06-08"
    },
    "growth": {
      "score": 0,
      "source": "prediction_registry.growth_score",
      "snapshotDate": "2026-06-08"
    },
    "momentum": {
      "score": 50,
      "source": "prediction_registry.momentum_score",
      "snapshotDate": "2026-06-08"
    },
    "value": {
      "score": 50,
      "source": "prediction_registry.value_score",
      "snapshotDate": "2026-06-08"
    },
    "risk": {
      "score": 38,
      "source": "prediction_registry.risk_score",
      "snapshotDate": "2026-06-08"
    },
    "stability": {
      "score": 50,
      "source": "prediction_registry.sector_score",
      "snapshotDate": "2026-06-08"
    }
  },
  "narrative": "No factor is above the strong threshold, which supports the at risk rating. Risk is moderate and should be monitored.",
  "lastUpdated": "2026-06-08",
  "lineage": {
    "sourceTable": "prediction_registry",
    "rawSymbol": "RELIANCE",
    "normalizedSymbol": "RELIANCE",
    "responseTimeMs": 0
  }
}
```

`companyName` is `null` because `prediction_registry` does not contain a company-name column. The page may still render display metadata from its separate metadata/registry path, but the StockStory health API does not synthesize names.

## Symbol Normalisation Verification

Implemented in:

`src/backend/web/routes/SymbolNormalizer.ts`

Rules verified:

Input | Normalized
--- | ---
`HDFCBANK.NS` | `HDFCBANK`
`INFY.NS` | `INFY`
`TCS.NS` | `TCS`
`RELIANCE` | `RELIANCE`

All prediction lookups use:

```sql
REPLACE(REPLACE(UPPER(symbol), '.NS', ''), '.BO', '')
```

This prevents `.NS` / `.BO` suffix ambiguity before lookup.

## Duplicate Symbol Audit

Validation environment:

`DATABASE_URL` was not set, so the local validation ran against SQLite fallback `data/stockstory.db`.

Metric | Observed
--- | ---
Duplicate symbol groups before normalisation | 94
Duplicate symbol groups after normalisation | 0
Affected symbols list | None in local fallback DB because duplicate groups are repeated same raw symbol rows, not mixed `.NS`/base variants.

Query used:

```sql
SELECT COUNT(*) AS duplicate_groups
FROM (
  SELECT symbol
  FROM prediction_registry
  GROUP BY symbol
  HAVING COUNT(*) > 1
) x;

SELECT COUNT(*) AS duplicate_groups
FROM (
  SELECT REPLACE(REPLACE(UPPER(symbol), '.NS', ''), '.BO', '') AS normalized_symbol
  FROM prediction_registry
  GROUP BY REPLACE(REPLACE(UPPER(symbol), '.NS', ''), '.BO', '')
  HAVING COUNT(DISTINCT symbol) > 1
) x;
```

## Factor Lineage Verification

Returned field | Source column | Lineage field
--- | --- | ---
`healthScore` | `prediction_registry.ranking_score` | `lineage.sourceTable`
`classification` | `prediction_registry.classification` | `lineage.sourceTable`
`confidence.score` | `prediction_registry.confidence_score` | `confidence.source`
`confidence.level` | `prediction_registry.confidence_level` | `confidence.source`
`factors.quality.score` | `prediction_registry.quality_score` | `factors.quality.source`
`factors.growth.score` | `prediction_registry.growth_score` | `factors.growth.source`
`factors.momentum.score` | `prediction_registry.momentum_score` | `factors.momentum.source`
`factors.value.score` | `prediction_registry.value_score` | `factors.value.source`
`factors.risk.score` | `prediction_registry.risk_score` | `factors.risk.source`
`factors.stability.score` | `prediction_registry.sector_score` | `factors.stability.source`
`lastUpdated` | `prediction_registry.prediction_date` | factor `snapshotDate`

Every factor object includes:

```json
{
  "score": 51,
  "source": "prediction_registry.quality_score",
  "snapshotDate": "2026-06-08"
}
```

## Failure Behaviour

Unknown symbol:

```json
{
  "code": "STOCKSTORY_SYMBOL_NOT_FOUND",
  "symbol": "UNKNOWN"
}
```

HTTP status: `404`

Missing snapshot:

```json
{
  "status": "unavailable",
  "symbol": "RELIANCE"
}
```

No synthetic values are emitted in either failure mode.

## Response Timing

Local validation query bundle timing:

`1027 ms`

The route also includes `lineage.responseTimeMs`, measured per request from route entry through final response construction.

## Snapshot Date Coverage

Local fallback DB coverage:

Metric | Observed
--- | ---
Prediction rows | 107,484
Normalized symbols | 94
Minimum prediction date | 2021-08-17
Maximum prediction date | 2026-06-08

The request background states production has 107,664 predictions and 124 symbols. That production count could not be observed locally because `DATABASE_URL` was not configured in this validation run.

## StockStoryPage Integration

Updated:

`src/pages/StockStoryPage.tsx`

Changes:

- Fetches `/api/stockstory/:ticker`.
- Adapts only valid registry-backed responses.
- Treats `status: "unavailable"` as an unavailable state.
- Removed the previous seeded `50` score fallback object.
- Shows an explicit unavailable message when no production `prediction_registry` snapshot exists.
- Renders factor-detail comments from lineage sources instead of pending placeholder text.

## Typecheck

Command:

`npm run typecheck`

Result:

Failed on pre-existing repository errors outside this change:

- `src/backend/web/routes/intelligence/attention.ts` missing `../../../intelligence/AttentionEngine`
- `src/backend/web/routes/predictions/signals.ts` missing `../../../intelligence/PredictionDiffEngine`
- `src/backend/web/routes/predictions/signals.ts` missing `../../../intelligence/SignalValidationEngine`
- `src/services/retention/SubscriptionService.ts` nullability errors

No typecheck errors remain from:

- `src/backend/web/routes/stockstory.ts`
- `src/backend/web/routes/SymbolNormalizer.ts`
- `src/pages/StockStoryPage.tsx`

