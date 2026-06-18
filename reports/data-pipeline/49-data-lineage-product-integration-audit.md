# Data-Lineage Product Integration Audit

## Baseline
**Commit:** `49619dc1` — Rebuild StockStory Intelligence OS experience

## Available lineage tables

| Table | Populated? | Read by API? | Can surface now? |
|---|---|---|---|
| `prediction_input_lineage` | ✅ Yes | ❌ Never read by any endpoint | ✅ Query by symbol |
| `financial_snapshots` (source_label, source_url, ingestion_timestamp) | ✅ Yes | ❌ Not surfaced | ✅ Include in response |
| `provider_field_lineage` | ✅ Yes | ❌ Not surfaced | ✅ Join with ingestion runs |
| `provider_ingestion_runs` | ✅ Yes | ❌ Not surfaced | ✅ For run metadata |
| `scoring_runs` | ✅ Yes | ❌ Not surfaced | ✅ model_version available |
| `data_completeness_metrics` | ✅ Yes | ❌ Not surfaced | ✅ Per-symbol scores |
| `provider_authorization_registry` | ✅ Yes | ❌ Not surfaced | ✅ Status |
| `factor_snapshots` | ✅ Yes | ✅ Partial (in-memory) | No source columns |
| `feature_snapshots` | ✅ Yes | ✅ Partial (in-memory) | No source columns |

## Key finding
`prediction_input_lineage` is the richest lineage table but is **never consumed by any API**. All current "lineage" in API responses is fabricated in-memory using `new Date().toISOString()`.

## What to build
1. `GET /api/research/lineage/:symbol` — queries real lineage tables
2. `SourceTraceTimeline` component — visual per-symbol input provenance
3. `ResearchAuditDrawer` — SpatialSheet wrapping full symbol audit
4. Integrate into Company, Rankings, Signals, Trust Centre pages

## What to NOT fake
- `retrievedAt` — must come from DB
- `isFallback` / `isSynthetic` — must come from DB columns
- `provider` — must come from `source_name`
- `sourceUrl` — must come from `source_url` columns
- If data unavailable: "Lineage unavailable for this field."
