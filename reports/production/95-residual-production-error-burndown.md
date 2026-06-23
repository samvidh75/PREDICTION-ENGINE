# Part DM — Residual Production Error Burn-Down

## Baseline
**Commit:** d5f929c84 (Part DL final)

## Production audit at start (2026-06-23)

| Check | Result |
|---|---|
| RELIANCE search exact | PASS (Reliance #1) |
| TCS search exact | PASS (TCS #1) |
| INFY search exact | PASS (INFY #1) |
| ITC search exact | PASS (ITC #1) |
| HDFCBANK search exact | PASS (HDFCBANK #1) |
| Scanner duplicates/null scores | PASS (0 results, no fake data) |
| Quote exchange | PASS (NSE) |
| Technicals endpoint | PASS (RELIANCE, asOf: 2026-06-20) |
| News sanitization | PASS (no HTML leakage) |
| Healthz | PASS (ok) |
| Readyz | PASS (ok) |
| SVG route | PASS (image/svg+xml) |

## Issues already fixed from previous phases

- Search exact match: Fixed in Part DK/DL
- Scanner null-score dedupe: Fixed in Part DK
- Quote exchange: Fixed in Part DL (MarketQuoteReconciler)
- Technicals route: Fixed in Part DL
- News HTML: Fixed in Part DK
- Health/readyz truth: Fixed via health route
- Route compression: Fixed in Part DK
- Track merge: Fixed in Part DK
- Mobile nav: Fixed in Part DK
- Logo/header: Fixed in Part DK
- SVG route: Fixed in vercel.json
- Public-copy audit: Fixed in Part DK
- IndianAPI client: Fixed in Part DK

## Remaining observations

- Scanner returns 0 results — prediction_registry has 312 rows but insufficient scoring evidence. Falls back to financial_snapshots. This is correct behavior (no fake data). Pipeline needs to run.
- RC2 gate scripts created: `scripts/audit-rc2.ts`

## Production-readiness estimate: 8.2/10
