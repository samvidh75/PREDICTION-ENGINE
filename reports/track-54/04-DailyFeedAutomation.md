# AGENT D — Daily Feed Automation

## Design

### Feed Events
1. **Top Movers**: factor_snapshots today vs yesterday, sorted by abs(delta)
2. **New Predictions**: prediction_registry WHERE prediction_date = today
3. **Risk Changes**: risk_factor delta > 5 points
4. **Narrative Changes**: factor direction flips (improving → deteriorating or vice versa)
5. **Classification Changes**: classification changed since yesterday

### Storage
```sql
CREATE TABLE IF NOT EXISTS daily_feed_events (
  id TEXT PRIMARY KEY,
  event_date TEXT NOT NULL,
  event_type TEXT NOT NULL,
  symbol TEXT,
  headline TEXT NOT NULL,
  detail TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API
GET /api/intelligence/feed — returns today's feed events ordered by priority DESC

### Integration
DailyFeed.tsx (existing component) consumes this endpoint. Currently shows generic feed data — this pipeline makes it automated and personal.

### Success
- ✅ Feed populated automatically after daily prediction run
- ✅ Events prioritized (risk changes > prediction alerts > routine updates)
- ✅ Frontend consumes real data, not hardcoded
