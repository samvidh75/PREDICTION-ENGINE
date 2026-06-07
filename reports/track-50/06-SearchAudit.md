# AGENT F — Search Experience Audit

## Current Search Architecture
- SearchPage.tsx handles search
- Symbols loaded from StockRegistry (client-side)
- No server-side search endpoint
- No typo tolerance

## Success Rate Estimate
- 95%+ if user types exact NSE symbol
- ~70% if user types company name (e.g., "Reliance Industries")
- 0% for misspellings (e.g., "reliancee")

## Recommendations
1. Add server-side search endpoint with fuzzy matching
2. Index company names, not just symbols
3. Return top 5 matches for partial queries
4. Track search_success vs search_failed via analytics

## Latency Target
- Client-side lookup: < 50ms (current, acceptable)
- Server-side fallback: < 200ms (to be added)
- 95th percentile: < 500ms
