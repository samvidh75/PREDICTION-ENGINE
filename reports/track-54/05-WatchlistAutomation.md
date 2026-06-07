# AGENT E — Watchlist Delta Engine

## Design

### Computation (per watchlisted symbol)
For each symbol in watchlist:
1. Fetch latest factor_snapshot (today)
2. Fetch previous factor_snapshot (yesterday/t-1)
3. Compute:
   - health_change = factor_score(today) - factor_score(yesterday)
   - quality_change = quality_factor(today) - quality_factor(yesterday)
   - risk_change = risk_factor(today) - risk_factor(yesterday)
   - prediction_change: compare latest vs previous prediction classification

### Storage
```sql
CREATE TABLE IF NOT EXISTS watchlist_events (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  event_date TEXT NOT NULL,
  health_change REAL,
  quality_change REAL,
  risk_change REAL,
  prediction_change TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Integration
WatchlistIntelligence.tsx already consumes /api/intelligence/watchlist which already returns scoreChanges and movers. This pipeline automates the data population behind that endpoint.

### API
GET /api/intelligence/watchlist?symbols=A,B,C (EXISTING — works, needs daily data population)

### Success
- ✅ Watchlist delta calculations automated
- ✅ No mock data — all deltas from real factor comparisons
- ✅ Frontend WatchlistIntelligence.tsx already built and wired
