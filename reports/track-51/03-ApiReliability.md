# AGENT C — API Reliability Audit

## Backend Routes Audited

### Intelligence Routes (src/backend/web/routes/intelligence.ts)
| Route | Method | Cache | Fallback |
|-------|--------|-------|----------|
| /api/intelligence/company/:symbol | GET | In-memory | Default snapshot returned |
| /api/intelligence/market | GET | In-memory | N/A |
| /api/intelligence/sector/:sector | GET | In-memory | N/A |
| /api/intelligence/portfolio | GET/POST | In-memory | Default 5-stock portfolio |
| /api/intelligence/discovery/rankings | GET | None | Empty arrays |
| /api/intelligence/watchlist | GET | None | Default 5 symbols |
| /api/company/:symbol/financials | GET | None | Empty array |
| /api/company/:symbol/ownership | GET | None | Derived from free_float |
| /api/company/:symbol/valuation | GET | None | Calculated from PE |
| /api/company/:symbol/risks | GET | None | Empty array |
| /api/company/:symbol/catalysts | GET | None | Empty array |
| /api/company/:symbol/timeline | GET | None | Empty array |
| /api/stockstory/:symbol | GET | In-memory | Pending calculation fallback |

### Prediction Routes (added TRACK-48)
| Route | Method | Cache | Fallback |
|-------|--------|-------|----------|
| /api/predictions/journal | GET | None | Empty array (graceful) |
| /api/stockstory/:symbol/predictions | GET | None | Empty array (graceful) |

### Analytics Routes (defined, pending backend)
| Route | Method | Purpose |
|-------|--------|---------|
| /api/analytics/events | POST | Batch event ingestion |
| /api/analytics/feedback | POST | Feedback storage |

## Reliability Assessment
- All existing routes handle null data gracefully
- Intelligence cache prevents repeated DB hits
- Error handling returns structured JSON errors
- Timeouts: none explicit (relies on fastify defaults)
- No rate limiting on prediction endpoints (security gap — see Agent F)
- Watchlist route queries up to 5 symbols efficiently

## Latency Estimates
- Simple SELECT queries: < 50ms
- StockStory 7-engine evaluation: 100-300ms
- Discovery rankings (full table scan): 500ms-2s for large universe
- Cached routes: < 5ms

## Verdict: RELIABLE WITH KNOWN GAPS
Analytics backend needs to be created. Rate limiting should be added for public endpoints.
