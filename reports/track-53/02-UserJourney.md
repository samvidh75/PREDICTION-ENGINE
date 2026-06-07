# AGENT B — User Journey Mapping

## Primary Journey: Search → Superpage → Return
1. **Landing/Login** → ✅ DashboardHub
2. **Search** → StockRegistry lookup → ✅ Fast (client-side)
3. **Superpage V8** → 7 sections load → ⚠️ API dependency (latency risk)
4. **Add to Watchlist** → ✅ One-click
5. **Daily Return** → Watchlist Intelligence shows deltas → ⚠️ Delays if data is stale

## Drop-off Points
| Point | Risk | Severity |
|-------|------|----------|
| Search fails (no results) | User leaves | HIGH — need fuzzy search |
| Superpage loads blank | Trust destroyed | CRITICAL — has fallback |
| Compare tool no data | Dead end | MEDIUM |
| Trust Centre empty | Missed trust opportunity | HIGH |
| Watchlist empty | No reason to return | HIGH — need onboarding |

## Friction Points
1. **Compare hidden in navigation** — most users won't find it
2. **Trust Centre not linked from Superpage** — trust features isolated
3. **Portfolio Doctor requires manual setup** — no "sample portfolio" quick-start
4. **No search → Superpage deep link in navigation rail**

## Recommendations
1. Add "View Trust Centre" link to Superpage transparency footer
2. Add "Compare with..." button on Superpage
3. Add Watchlist Intelligence card to DashboardHub
4. Fix empty states with teaching copy + presets
