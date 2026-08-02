# Part BD — Annual Financials Mapping, Histogram Activation, Rankings Polish

## Baseline Commit
`dc44f6073` — Activate scanner rankings and polish stock detail experience

## Final Commit
`HEAD`

## Deployment Status
- Vercel frontend: ✅ 200
- Vercel API proxy: ✅ 200
- Railway: Deploy pending

## Annual Financials Mapping
The IndianAPI `/stock` endpoint returns a `financials` array with annual income statement data. The route now extracts:
- **Revenue** — from "Total Revenue" or "Revenue" field
- **PAT** — from "Net Income" field  
- **Operating Profit** — from "Operating Income" field (EBITDA proxy)

Available fiscal years for RELIANCE: FY2020-FY2026 (7 years)

The `/api/stock/:symbol` route now includes `annualFinancials` array with sorted entries.

## Rankings Status
Scanner is populated with real data. Rankings route still needs verification — the scanner ranking approach (via `UnifiedPredictionEngine`) already works for stock ordering by conviction score.

## Remaining Work
- Frontend histogram component needs updating to consume `annualFinancials`
- Rankings page activation if separate route exists
- Mobile QA screenshots

## Verification
```
npm run typecheck:backend  ✅
npm run build:backend      ✅
npm run build:frontend     ✅
```

## No Fake Data Confirmed
