# AGENT H — Cron & Scheduler

## Daily Pipeline Sequence

### Phase 1: Data Refresh (06:00 IST)
1. Run yfinance/data population scripts
2. Verify daily_prices updated for all symbols
3. Verify factor_snapshots recomputed from new prices

### Phase 2: Prediction Generation (07:00 IST)
1. predictionFactory.generateDaily([30, 90, 365])
2. Log: total, created, skipped, errors
3. Check: errors.length === 0 → continue

### Phase 3: Outcome Validation (07:30 IST)
1. Find predictions past maturity date
2. Compute actual_returns from daily_prices
3. Update validation_status in prediction_registry
4. Log: total validated today

### Phase 4: Feed Update (08:00 IST)
1. Compute top factor movers
2. Generate daily_feed_events
3. Compute watchlist deltas for all watchlisted symbols

### Phase 5: Trust Metrics Refresh (08:15 IST)
1. TrustMetricsService recomputes all stats
2. Cache invalidated → fresh on next page load

### Implementation
```typescript
// DailyPipelineOrchestrator.ts (to be created)
export class DailyPipelineOrchestrator {
  async execute(): Promise<PipelineRunReport> {
    // Phase 1-5 execution with error isolation
  }
}
```

### Scheduling Options
- **Development**: Manual invocation via script
- **Production**: Node-cron or OS-level cron job
- **Serverless**: AWS EventBridge / Google Cloud Scheduler

### Success
- ✅ Pipeline sequence defined
- ✅ Error isolation per phase
- ✅ Idempotent (safe to re-run)
