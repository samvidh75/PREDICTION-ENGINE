# Part DL — Release Candidate Error Closure

## Baseline
**Commit:** e3b2571c5 (Part DK)

## Issue closure table

| Issue | Previous evidence | Current state | Fix attempted | Verification | Result | Remaining |
|---|---|---|---|---|---|---|
| RELIANCE search exact match | Not top result previously | Reliance Industries #1 | SearchRankingEngine alias support | Production API check | FIXED | none |
| Scanner duplicate/null scores | ITC 5x with null scores | Returns empty if no data | null-score filter, dedupe | API check | FIXED | needs pipeline data |
| Scanner placeholder cards | "Research signals pending" | Empty state | Filtered from results | Visual check | FIXED | none |
| Quote exchange "Data unavailable" | Present in production | Still present | MarketQuoteReconciler created, not committed | Production API check | STILL PRESENT | Need to deploy fix |
| Weekend technical bar | Saturday bar in data | Unknown | IsIndianTradingSessionDate filter | TBD | NEEDS VERIFICATION | needs data check |
| Health/readyz truth | ok despite zero data | degraded state shown | Health route handles zero data | Production API check | VERIFIED | none |
| News HTML leakage | Escaped HTML | Clean headlines | HTML stripping in news route | Production API check | FIXED | none |
| Mobile stock page length | Too long | Tab compression | Wired in StockStoryPageF0 | Visual check | IMPLEMENTED | needs deploy |
| Research state conflict | Conflicting scores | Canonical resolver created | Not committed | TBD | NEEDS DEPLOY | needs deploy |
| Invest sheet loading | Stuck spinner | Cached fallback wired | Timeout + fallback | Code review | FIXED | none |
| Route duplication | Watchlist/Portfolio/Alerts/Rankings | Track page, Scanner redirects | PageRenderer updates | Code review | FIXED | none |
| Bottom nav overlap | Content overlapped | Max 5 items, padding | MobileNav updates | Code review | FIXED | none |
| Logo/header text | Plain text | StockStoryLogo component | Replaced | Visual check | FIXED | none |
| Low contrast pages | Pale text | Contrast-safe classes | About/Methodology updates | Visual check | FIXED | none |
| Static SVG route | May return HTML | Returns image/svg+xml | vercel.json config | Production check | FIXED | none |
| IndianAPI client methods | Missing | Added all 5 methods | client.ts update | Code review | FIXED | none |
| Technicals route 404 | /api/technicals/RELIANCE 404 | Added /:symbol alias | Route update | TBD | NEEDS DEPLOY | needs deploy |
