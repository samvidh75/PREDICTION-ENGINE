# StockStory India — 100% Free AI Platform

## Cost Breakdown

| Component | Cost | Notes |
|-----------|------|-------|
| Frontend | Rs 0 | Vercel free tier |
| Database | Rs 0 | Supabase 500MB free |
| AI (Browser) | Rs 0 | Transformers.js, open-source |
| AI (Fallback) | Rs 0 | Groq free tier |
| Monitoring | Rs 0 | Client-side only |

**Total: Rs 0/month**

## Architecture

```
User Browser
  Regex Parser (instant, offline)
  Transformers.js (browser AI, offline)
  Groq API (fallback only)
Database (Supabase, Rs 0)
CDN (Vercel, Rs 0)
```

## Performance

- Regex queries: < 50ms (80% of traffic)
- Browser AI: 50-500ms (15% of traffic)
- API fallback: 500-2000ms (5% of traffic)

---

A cinematic financial intelligence operating system focused on market storytelling, educational analytics, probabilistic intelligence systems, and institutional-grade UX.

## Platform Direction

StockStory India is evolving from a prototype-stage financial dashboard into a scalable market intelligence ecosystem.

## Refactor Goals

- modular feature architecture
- scalable services layer
- reusable telemetry systems
- performance optimisation
- cleaner information hierarchy
- calmer institutional UX
- responsive layouts
- Healthometer architecture
- storytelling-driven analytics

## Planned Architecture

```txt
src/
  app/
  features/
  systems/
  services/
  telemetry/
  intelligence/
  storytelling/
  shared/
```

## F5 Unified Prediction Engine

The F5 unified prediction engine consolidates all scoring into a single authoritative engine (`UnifiedPredictionEngine`), replacing the previous three-path system.

### Key Files

| File | Purpose |
|---|---|
| `src/prediction-engine/UnifiedPredictionEngine.ts` | Authoritative scoring engine |
| `src/prediction-engine/types.ts` | Type definitions for input/output |
| `src/prediction-engine/scoring/FactorGroupScorer.ts` | Per-group breakpoint-based scoring |
| `src/prediction-engine/scoring/CompositeScorer.ts` | Weighted composite + risk dampening |
| `src/prediction-engine/scoring/ConfidenceScorer.ts` | Confidence formula (completeness/freshness/provider) |
| `src/prediction-engine/scoring/ClassificationScorer.ts` | Classification thresholds |
| `src/prediction-engine/scoring/MissingDataPolicy.ts` | Null/fabrication policy enforcement |
| `src/prediction-engine/features/FeatureRegistry.ts` | 117-feature catalog with metadata |
| `src/prediction-engine/adapters/ScoreSnapshotAdapter.ts` | Adapter for scoreEngine.ts bridge |
| `src/prediction-engine/adapters/PredictionFactoryAdapter.ts` | Adapter for PredictionFactory bridge |
| `scripts/shadow-compare-unified-engine.ts` | Shadow mode comparison script |
| `scripts/audit-unified-feature-coverage.ts` | Feature coverage audit script |

### Feature Flags

| Flag | Default | Description |
|---|---|---|
| `UNIFIED_PREDICTION_ENGINE_ENABLED` | `false` | Master switch for unified engine as authoritative scorer |
| `UNIFIED_PREDICTION_ENGINE_SHADOW_MODE` | `false` | Enable shadow comparison mode (no writes) |
| `F5_SCORE_SNAPSHOT_DELEGATE` | `false` | Delegate `scoreSnapshot()` to unified engine |
| `F5_PREDICTION_FACTORY_DELEGATE` | `false` | Delegate `PredictionFactory` to unified engine |
| `CONFIRM_UNIFIED_ENGINE_APPLY` | `false` | Confirmation gate for apply mode |
| `UNIFIED_ENGINE_MODEL_VERSION` | `unified-v1.0.0` | Model version identifier |

### How to Enable

1. **Shadow mode** (compare old vs new without affecting output):
   ```bash
   export UNIFIED_PREDICTION_ENGINE_SHADOW_MODE=true
   npx tsx scripts/shadow-compare-unified-engine.ts --symbols RELIANCE,TCS,INFY
   ```

2. **Active delegation** (use unified engine as scorer):
   ```bash
   export UNIFIED_PREDICTION_ENGINE_ENABLED=true
   export F5_SCORE_SNAPSHOT_DELEGATE=true     # for scoreSnapshot path
   export F5_PREDICTION_FACTORY_DELEGATE=true  # for PredictionFactory path
   ```

3. **Run audit**:
   ```bash
   npx tsx scripts/audit-unified-feature-coverage.ts
   ```

See `reports/f5-unified-prediction-engine/` for detailed analysis, migration plan, shadow mode comparison, feature coverage, test evidence, and the final verdict.
