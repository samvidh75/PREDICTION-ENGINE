# Part BM — Visible Data Reality Audit

## Symbols Checked
RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, COALINDIA, ITC, SBIN, LT, BHARTIARTL

## Data Source Chain
1. API: `/api/stock/:symbol` (Vercel proxy → Railway backend)
2. Frontend: `useStockData` → `StockResearchPage` / `ScannerPage` / `ComparePage`
3. Formatting: `fPrice`, `fMarketCap`, `fPercent`, `fRatio` from `src/lib/format.ts`

## Verified Fields

| Field | Source | Format | Verified |
|-------|--------|--------|----------|
| companyName | API `price.companyName` | Raw string | ✅ |
| symbol | API `symbol` | Raw string | ✅ |
| sector/industry | API `price.sector` / `price.industry` | Raw string | ✅ |
| current price | API `price.current` | `fPrice` (₹thin-space + en-IN locale) | ✅ |
| change | API `price.change` | Signed float | ✅ |
| marketCap | API `price.marketCap` | `fMarketCap` (₹X.XL Cr / ₹X,XXX Cr) | ✅ |
| peRatio | API `fundamentals.peRatio` | `fRatio` (X.Xx) | ✅ |
| roe | API `fundamentals.roe` | `fPercent` (X.X%) | ✅ |
| dividendYield | API `fundamentals.dividendYield` | `fPercent` (X.X%) | ✅ |
| debtToEquity | API `fundamentals.debtToEquity` | Number | ✅ |
| currentRatio | API `fundamentals.currentRatio` | Number | ✅ |
| eps | API `fundamentals.eps` | Number | ✅ |
| 52-week high/low | API `price.weekHigh52` / `price.weekLow52` | `fPrice` | ✅ |
| health score | API `health.score` | Number | ✅ |
| classification | API `health.classification` | Raw string | ✅ |
| annual financials | API `annualFinancials` | `FinancialHistogram` | ✅ |
| historical closes | API `historical.closes` | `PriceChart` (recharts) | ✅ |

## Issues Found

| Issue | Location | Severity | Fix |
|-------|----------|----------|-----|
| "Data is being compiled from multiple sources." | StockResearchPage.tsx | Low | Changed to "Based on latest available market data." |

No data-reality mismatches were found. All UI values trace to verified API/database output.
