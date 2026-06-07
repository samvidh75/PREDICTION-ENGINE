# AGENT G — Cohort Dashboard

## Data Sources
- /api/analytics/events (batch, requires backend endpoint)
- /api/analytics/feedback (individual, requires backend endpoint)

## Dashboard Metrics (Internal/CEO Dashboard)
1. **Usage**: DAU, WAU, MAU trend
2. **Popular Features**: Page visit distribution (compare/journal/trust %)
3. **Popular Stocks**: Top 20 symbols by view count
4. **Retention**: Day 1, Day 7, Day 30 return rate
5. **Feedback Sentiment**: Ratio of useful / (confusing + missing + incorrect)
6. **Errors**: API failures, client-side exceptions

## Backend Implementation Needed
```sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  label TEXT,
  value REAL,
  timestamp TEXT NOT NULL,
  page TEXT,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS analytics_feedback (
  id TEXT PRIMARY KEY,
  page TEXT NOT NULL,
  component TEXT,
  symbol TEXT,
  feedback_type TEXT NOT NULL,
  comment TEXT,
  timestamp TEXT NOT NULL
);
```

## Priority
- Events table: P0 (blocks all other metrics)
- Feedback table: P1 (qualitative validation)
- Dashboard UI: P2 (internal tool, not public facing)
