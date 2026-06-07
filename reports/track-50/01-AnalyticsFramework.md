# AGENT A — Analytics Framework

## Implementation: src/analytics/EventAnalyticsEngine.ts

### Event Categories
1. **discovery** — search_performed, search_success, search_failed, stock_viewed, compare_performed
2. **engagement** — superpage_view, superpage_scroll_50, superpage_scroll_100, watchlist_add, watchlist_remove
3. **trust** — trust_centre_visit, prediction_journal_visit, methodology_click, limitations_click
4. **retention** — session_start, session_end, daily_active, returning_user

### Architecture
- Fire-and-forget (analytics must never block UI)
- Auto-flush every 10 events to /api/analytics/events (POST)
- Feedback events dispatch to /api/analytics/feedback (POST)
- keepalive: true for pending navigations
- Singleton pattern: `analytics.trackStockView('RELIANCE', 'search', false)`

### Backend Endpoints Needed
- POST /api/analytics/events — batch event ingestion
- POST /api/analytics/feedback — feedback storage
- GET /api/analytics/cohort — internal dashboard (Agent G)
