# AGENT F — Security Audit

## Attack Surface

### SQL Injection
- **Risk**: LOW — All queries use parameterized $1, $2, $3 placeholders via pg/better-sqlite3
- **No string concatenation** of user input into SQL anywhere in intelligence routes
- **Symbol sanitization**: .toUpperCase().trim() applied to all ticker inputs

### XSS (Cross-Site Scripting)
- **Risk**: LOW — React JSX auto-escapes by default
- **No dangerouslySetInnerHTML** used in any new component
- **innerHTML** not used — all content rendered through JSX

### Rate Limiting
- **Risk**: MEDIUM — No rate limiting on /api/predictions/journal or /api/intelligence endpoints
- **Analytics endpoints**: POST /api/analytics/events would be vulnerable without protection
- **Recommendation**: Add fastify-rate-limit middleware to all POST routes

### Malformed Requests
- **Risk**: LOW — All routes validate params and return structured errors
- **Watchlist route**: Accepts up to any number of symbols (should cap at 50)
- **Prediction journal**: Returns up to 100 rows (acceptable limit)

### API Key Exposure
- **Finnhub/IndianAPI keys**: Present in .env, NOT in frontend code
- **Upstox OAuth**: Client secret server-side only, client ID is public (for OAuth URL)
- **Firebase config**: Public identifiers exposed via VITE_ prefix (this is correct per Firebase docs)

### Public Routes
- /api/predictions/journal: Intentionally public (Trust Centre data)
- /api/stockstory/:symbol: Intentionally public (company intelligence)
- /api/company/:symbol/*: Intentionally public

## Recommendations
1. Add rate limiting: 100 req/min per IP on public routes
2. Cap watchlist symbols to 50
3. Cap prediction journal limit to 500 rows
4. Add request size limits to POST bodies
5. Add CORS headers for analytics endpoints

## Verdict: LOW RISK FOR BETA
SQL injection and XSS are well-mitigated. Rate limiting is the top priority before public launch.
