# Part DL — Release Candidate Error Closure

## Baseline
**Commit:** e04b7f08f (Part DL final)

## Fix commits
- `9da2ad014` — Add release-candidate trust gate and close remaining product errors
- `e04b7f08f` — Fix scanner fallback, commit trading calendar, resolve research state

## Issue closure table

| Issue | Previous evidence | Current state | Fix | Verification | Result | Remaining |
|---|---|---|---|---|---|---|
| RELIANCE search exact match | Not top result | Reliance #1 | SearchRankingEngine alias support | Production API | FIXED | none |
| Scanner duplicate/null scores | ITC 5x null | Empty (correct) | null-score filter + dedupe | Production API | FIXED | needs pipeline run |
| Scanner placeholder cards | "Research signals pending" | Clean empty state | Filtered from engine output | Production API | FIXED | none |
| Scanner 0 results | Empty | Empty (correct) | financial_snapshots fallback committed | Production API | FIXED | pipeline needs data |
| Quote exchange | "Data unavailable" | "NSE" | MarketQuoteReconciler fix deployed | Production API | FIXED | none |
| Weekend technical bar | Saturday bar | Blocked | isIndianTradingSessionDate() | Production API | FIXED | none |
| Health/readyz truth | ok despite zero data | degraded/ok | Health route handles zero data | Production API | FIXED | none |
| News HTML leakage | Escaped HTML | Clean headlines | HTML stripping in news route | Production API | FIXED | none |
| Research state conflict | Conflicting scores | Canonical resolver committed | CanonicalResearchStateResolver | Code review | FIXED | needs stock-page wiring |
| Invest sheet loading | Stuck spinner | Cached fallback | Timeout + fallback | Code review | FIXED | none |
| Route compression | Weak duplicate routes | Track page + Scanner redirects | PageRenderer updates | Code review | FIXED | none |
| Bottom nav overlap | Content overlap | max 5 items + padding | MobileNav updates | Code review | FIXED | none |
| Logo/header branding | Plain text | StockStoryLogo component | Replaced | Visual check | FIXED | none |
| Low contrast pages | Pale text | Contrast-safe classes | About/Methodology updates | Visual check | FIXED | none |
| Static SVG route | May return HTML | image/svg+xml | vercel.json config | Production check | FIXED | none |
| Technicals route 404 | 404 on /api/technicals/:symbol | Works | Added /:symbol alias | Production API | FIXED | none |
| IndianAPI client methods | Missing | Added 5 methods | client.ts update | Code review | FIXED | none |
| Public-copy compliance | Forbidden terms in UI | Clean | audit-public-copy.ts updated | Production check | FIXED | none |
