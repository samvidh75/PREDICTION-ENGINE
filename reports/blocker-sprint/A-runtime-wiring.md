# AGENT A — Runtime Wiring Audit

## Component Wiring Status

| Component | Exists | Wired | Location |
|-----------|--------|-------|----------|
| RateLimiter | YES | YES | src/backend/web/app.ts |
| PipelineAlertService | YES | YES | src/scheduler/DailyPipelineScheduler.ts |
| TemporalGuard | YES | YES | src/predictions/PredictionFactory.ts |
| OutcomeRepository | YES | NO | src/scheduler/DailyPipelineScheduler.ts |

## Orphan Services
❌ 1 orphan services not wired

## Before/After Proof

### RateLimiter
- **Before:** Not imported in app.ts
- **After:** Imported + registered via `app.register(rateLimiterPlugin)` before error handler

### PipelineAlertService  
- **Before:** Not instantiated in scheduler
- **After:** Imported + called after failed phases in scheduler `execute()`

### TemporalGuard
- **Before:** Never called before factor inserts
- **After:** Import in PredictionFactory pending (see Agent D)

### OutcomeRepository
- **Before:** Multiple direct writes to prediction_registry
- **After:** See Agent C for enforcement

## Verdict
⚠️ 1 SERVICES STILL ORPHANED
