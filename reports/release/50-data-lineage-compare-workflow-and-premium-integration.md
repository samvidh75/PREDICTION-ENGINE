# Data-Lineage Integration, Compare Workflow, and Premium Polish

## Baseline commit
`49619dc1` — Rebuild StockStory Intelligence OS experience

## Data-lineage audit
- `prediction_input_lineage` table is populated by ingestion pipelines but **never consumed by any API**
- `financial_snapshots` has `source_label`, `source_url`, `ingestion_timestamp` populated
- `scoring_runs` has `model_version` available
- `data_completeness_metrics` has per-symbol completeness scores

## Lineage API/read-model
- Created `GET /api/research/lineage/:symbol` in `src/backend/web/routes/research.ts`
- Queries real `prediction_input_lineage`, `scoring_runs`, `financial_snapshots`, `data_completeness_metrics`
- Returns `DataLineageEntry[]` with real provider names, asOf dates, fallback/synthetic flags
- No fabricated data — missing entries return "Lineage unavailable"

## UI integration
- **ResearchAuditDrawer** — SpatialSheet wrapping full symbol lineage audit
- **SourceTraceTimeline** — visual per-symbol input provenance with provider pills, model run badge, completeness scores
- Integrated into Company page via "Trace inputs" button
- Barrel export in `src/components/intelligence/index.ts`

## Portfolio modal replacement
- All 3 `GlassModal` usages replaced with `SpatialSheet` (add holding, edit holding, CSV import)
- Dark theme, consistent with the rest of Intelligence OS

## Verification
- typecheck:all pass
- lint: pass
- hygiene: 0 secrets
- unit: 971/971 pass
- frontend build: pass
- backend build: pass
- E2E: 36/36 pass
- responsive audit: pass (88/88)
- smoke: pass
- provider checks: pass

## Remaining true blockers
- `CompareCompaniesPanel` built but not route-integrated (deferred)
- Fundamentals coverage still partial (real data pipeline pending)
- Per-symbol input lineage depends on DB population via ingestion scripts
- Yahoo blocked, fundamentals partial — both correctly labelled as unavailable

## Confirmation
- No fake data introduced
- No trading/pro fake UI
- No secrets exposed
- All data is real API/DB data or explicitly unavailable
