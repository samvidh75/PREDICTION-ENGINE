# AGENT C — Security Hardening

## Audit Results

### CRITICAL (0)
No critical vulnerabilities found.

### HIGH (1)
- **Rate limiting absent**: No rate limiting on public endpoints. /api/predictions/journal and /api/intelligence routes are unprotected.
  - Fix: Add fastify-rate-limit with 100 req/min per IP

### MEDIUM (3)
- **CORS not configured for analytics**: POST /api/analytics/events needs explicit CORS
- **Prediction endpoints publicly queryable**: No auth required (by design for Trust Centre, but rate limiting mitigates)
- **Lock file in data/ directory**: .pipeline_lock could persist if process crashes (stale lock recovery exists)

### LOW (2)
- **Secrets in .env**: Standard practice, but .env should be gitignored (it appears to be)
- **No request size limits on POST**: Large payloads could exhaust memory (add fastify content-type-parser limits)

### SQL Injection: NONE
All queries use parameterized $1, $2, $3 placeholders. Verified in intelligence.ts.

### XSS Risk: NONE
React JSX auto-escapes. No dangerouslySetInnerHTML used.

### Secrets Exposure: NONE
- FINNHUB_KEY, INDIANAPI_KEY: In .env only
- UPSTOX_CLIENT_SECRET: In .env only
- Firebase API key: VITE_ prefixed (public, correct per Firebase docs)
- UPSTOX_ACCESS_TOKEN: In .env only
