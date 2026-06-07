# AGENT G — Empty State Audit

## Empty State Behaviors

| State | Current Behavior | Rating | Fix |
|-------|-----------------|--------|-----|
| No predictions | "No predictions recorded yet" in Journal | ⚠️ OK but misses opportunity | Add "Predictions are generated daily. Check back tomorrow." |
| No watchlist | "Add stocks to your watchlist" | ⚠️ Generic | Show 5 popular stocks with "Add to watchlist" buttons |
| No comparisons | Empty input fields | ⚠️ Incomplete | Show 3 preset comparisons: RELIANCE vs INFY, TCS vs INFY, etc. |
| Stale data | No visual indicator | ❌ Missing | DataFreshnessMonitor needs UI: "Last updated: 3 days ago" badge |
| Failed API | "Unable to load" with error | ✅ Good | Error boundary + retry message present |
| Missing company | "No results" implicit | ⚠️ Generic | Suggest similar symbols: "Did you mean RELIANCE?" |
| Empty Trust Centre | "Insufficient data" everywhere | ✅ Correct | But add "Check back after predictions accumulate" |

## Priority Fixes
1. Trust Centre empty state → explain the pipeline (P0)
2. Compare presets → popular comparisons (P1)
3. Watchlist empty → popular stocks with one-click add (P1)
4. Stale data indicator → freshness badge (P1)
5. Search typos → fuzzy suggestions (P2)
