# Data Integrity Policy — StockStory India

**TRACK-P2: HONEST DATA STATES, REMOVAL OF MISLEADING FALLBACKS, AND USER-FACING INTEGRITY**

Version: 1.0 | Date: 2026-06-09

---

## 1. Response Modes

Every production analytical API response carries a `mode` field:

| Mode | Description |
|---|---|
| `production_real` | All required inputs are real, traceable, and available |
| `production_partial` | Some real inputs exist, but analysis is incomplete |
| `production_unavailable` | Required inputs are absent — no analysis possible |
| `demo` | User explicitly requested sample/demonstration content |

Demo mode must never be selected implicitly.

---

## 2. Data Freshness Thresholds

### Market Data (features, factors, prices)

| Freshness | Threshold |
|---|---|
| `live` | Age ≤ 30 minutes during market-processing window |
| `recent` | Age ≤ 1 trading day (24 hours) |
| `stale` | Age ≤ 7 calendar days |
| `expired` | Age > 7 calendar days |
| `unknown` | No valid timestamp available |

### Quarterly Financial Data

| Freshness | Threshold |
|---|---|
| `recent` | Latest filed period ≤ 90 days ago |
| `stale` | Period ended ≤ 180 days ago |
| `expired` | Period ended > 180 days ago |
| `unknown` | No valid period-end date |

### Prediction Snapshots

| Freshness | Threshold |
|---|---|
| `recent` | Age ≤ 24 hours |
| `stale` | Age ≤ 3 days |
| `expired` | Age > 3 days |
| `unknown` | No prediction date available |

### News Articles

| Freshness | Threshold |
|---|---|
| `live` | Published ≤ 30 minutes ago |
| `recent` | Published ≤ 24 hours ago |
| `stale` | Published ≤ 3 days ago |
| `expired` | Published > 3 days ago |

Implementation: `src/shared/data/DataFreshness.ts`

---

## 3. Completeness Rules

Completeness score (0-100) is computed from:

- `availableFields / requiredFields * 100`
- Critical fields missing → availability forced to `partial` or `unavailable`
- Confidence impact: 5% per missing optional field, 15% per missing critical field, 3% per neutralized field
- >50% fields missing → forced `unavailable`
- All critical fields missing → forced `unavailable`

Implementation: `src/shared/data/DataCompleteness.ts`

---

## 4. Lineage Contract

Every analytical response exposes:

```typescript
interface DataLineageEntry {
  sourceTable: string;        // e.g. "feature_snapshots", "prediction_registry"
  sourceField?: string | null;
  provider?: string | null;   // null when unknown — never inferred
  asOf?: string | null;
  retrievedAt?: string | null;
  isFallback: boolean;
  isSynthetic: false;         // never true in production
  notes?: string | null;
}
```

- Provider is `null` unless stored record contains traceable provider and validation field
- Do not infer a provider from context
- Do not claim "validated by NSE/BSE" without lineage evidence

---

## 5. Error Codes

Standardized reason codes across all analytical routes:

| Code | Meaning |
|---|---|
| `OK` | Normal production-real response |
| `BACKEND_UNAVAILABLE` | Backend process or runtime is down |
| `DATABASE_UNAVAILABLE` | Database connection failure |
| `SNAPSHOT_NOT_GENERATED` | Prediction/feature/factor snapshots never generated |
| `FEATURE_SNAPSHOT_MISSING` | Feature snapshot absent |
| `FACTOR_SNAPSHOT_MISSING` | Factor snapshot absent |
| `FINANCIAL_SNAPSHOT_MISSING` | Financial snapshot absent |
| `FEATURE_OR_FACTOR_SNAPSHOT_MISSING` | Both feature and factor snapshots absent |
| `PREDICTION_NOT_FOUND` | Symbol exists in universe but no prediction |
| `EMPTY_PORTFOLIO` | No positions supplied |
| `ALL_POSITIONS_REJECTED` | All supplied positions invalid |
| `NO_SIGNIFICANT_SIGNALS` | Snapshot exists but no meaningful diffs |
| `DEMO_MODE` | Explicit demo request |
| `STALE_DATA` | Data is stale |
| `PARTIAL_DATA` | Some data available but incomplete |
| `VALIDATION_LIMITED` | Validation sample size < 30 |
| `INTERNAL_ERROR` | Unexpected server error |
| `INVALID_POSITIONS_FORMAT` | Position format invalid |

Routes distinguish:
- Request error (400) from system error (503) from empty result from unavailable result from valid zero-result

---

## 6. Narrative Restrictions

### Unavailable → factual message only

> "Analysis is unavailable because the required feature and factor snapshots have not been generated."

### Partial → limitation statement first

> "This is a partial assessment based on available data. Missing: [list]."

### Available → normal with freshness/as-of context

> "Assessment based on snapshots updated on 2026-06-08."

### Demo → explicitly labeled

> "Demonstration output only. This narrative is generated from sample holdings and must not be treated as a live portfolio assessment."

### Forbidden words in unavailable/partial responses:

- stable, healthy, resilient, validated, live, real-time, fair value, strong margins, moderate risk, high integrity, complete coverage

---

## 7. Forbidden Fallback Behaviors

The following are **prohibited** in production routes:

1. ❌ Fabricating analytical claims when source data is missing
2. ❌ Silently injecting sample holdings (RELIANCE, TCS, INFY, HDFCBANK, HAL)
3. ❌ Claiming "100% metrics present" without verification
4. ❌ Claiming "Real-time sync active" without verified freshness
5. ❌ Claiming "High Integrity (Validated by NSE/BSE provider registry)" without lineage evidence
6. ❌ Generating apparently complete outlooks from neutral/default values
7. ❌ Silently replacing missing factor values with neutral (50) without disclosure
8. ❌ Claiming provider validation without traceable provider field
9. ❌ Returning synthetic positive/negative drivers
10. ❌ Converting database errors into fake analysis

---

## 8. Cache Isolation

| Data State | Cache Key Pattern | TTL |
|---|---|---|
| `real` | `intelligence:company:real:${symbol}` | Normal |
| `partial` | `intelligence:company:partial:${symbol}` | Shorter |
| `unavailable` | `intelligence:company:unavailable:${symbol}` | Very short / no cache |
| `demo` | `intelligence:portfolio:demo:${hash}` | Isolated namespace |

Demo cache keys must never leak into production-real cache lookups.

---

## 9. Frontend State Rendering

Every UI consumer must render distinct states:

1. Loading spinner
2. Real data available (normal panel)
3. Partial data warning (`<PartialDataWarning />`)
4. Stale data badge (`<FreshnessBadge value="stale" />`)
5. Unavailable data state (`<UnavailableState />`)
6. Empty valid response (no significant signals, empty portfolio)
7. Explicit demo mode (`<DemoBadge />`)
8. Request error (backend unavailable)

Frontend must never:
- Convert unavailable → "markets are stable"
- Convert empty → "healthy"
- Convert stale → live badge
- Convert demo → production without explicit flag

---

## 10. Shared Contract

All analytical responses use the envelope defined in:

```
src/shared/data/AnalyticalResponse.ts
```

Builder functions:
- `realResponse()` — all data present, traceable
- `partialResponse()` — some data present
- `unavailableResponse()` — no valid data
- `demoResponse()` — explicit demo
- `emptyResponse()` — valid but empty (e.g., zero signals)
- `errorResponse()` — system failure

Every response includes: `status`, `mode`, `reason`, `message`, `generatedAt`, `dataState` (with availability, freshness, asOf, missingInputs, neutralizedFields, completenessScore, lineage).
