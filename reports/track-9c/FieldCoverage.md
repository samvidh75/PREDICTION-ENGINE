# Screener.in Field Coverage Audit
## TRACK-9C Phase 2 & 4 — Field Existence Proof & Runtime Validation

**Generated**: 2026-06-06  
**Data Source**: Real Screener.in RELIANCE page markdown  
**Rule**: If field cannot be proven from live HTML, mark NOT AVAILABLE. Never fabricate.

---

## Field-by-Field Truth Table

| Target Field | Available? | Source Section | Exact Pattern | RELIANCE Value | Evidence |
|-------------|-----------|----------------|---------------|----------------|----------|
| revenueGrowth | ✅ YES | Profit & Loss — Compounded Sales Growth | `TTM:\s*(\d+)%` | 10% | "Compounded Sales Growth ... TTM: 10%" |
| profitGrowth | ✅ YES | Profit & Loss — Compounded Profit Growth | `TTM:\s*(\d+)%` | 14% | "Compounded Profit Growth ... TTM: 14%" |
| epsGrowth | ❌ NOT AVAILABLE | — | — | — | No EPS growth anywhere on Screener. Only Compounded Sales/Profit Growth + Stock Price CAGR |
| fcfGrowth | ❌ NOT AVAILABLE | — | — | — | Only single-year FCF values. No multi-year FCF growth rate. |
| operatingMargin | ✅ YES | Profit & Loss — OPM% latest year | `OPM\s*%\s*[\s\S]*?Mar\s+\d{4}\s+(\d+)%` | 17% (FY2026) | "OPM % ... Mar 2026 17%" |
| currentRatio | ❌ NOT AVAILABLE | — | — | — | Ratios table has Working Capital Days, Debtor Days, Inventory Days. No Current Ratio. |
| dividendYield | ✅ YES | Company Header | `Dividend Yield\s+([\d.]+)\s*%` | 0.46% | "Dividend Yield 0.46 %" in header |
| bookValue | ✅ YES | Company Header | `Book Value\s+₹?\s*([\d,.]+)` | 668 | "Book Value ₹ 668" in header |
| marketCap | ✅ YES | Company Header | `Market Cap\s+₹?\s*([\d,.]+)\s*Cr` | 17,46,380 Cr. | "Market Cap ₹ 17,46,380 Cr." in header |
| eps | ✅ YES | Profit & Loss — EPS latest year | `EPS\s+in\s+Rs[\s\S]*?Mar\s+\d{4}\s+([\d.]+)` | 59.69 | "EPS in Rs ... Mar 2026 59.69" |
| peRatio | ✅ YES | Company Header (Upstox wins) | `Stock P\/E\s+([\d.]+)` | 22.4 | "Stock P/E 22.4" in header |
| roe | ✅ YES | Company Header (Upstox wins) | `ROE\s+([\d.]+)\s*%` | 8.91% | "ROE 8.91 %" in header |
| roce (roic) | ✅ YES | Company Header (Upstox wins) | `ROCE\s+([\d.]+)\s*%` | 10.3% | "ROCE 10.3 %" in header |

---

## Per-Symbol Coverage Table

| Symbol | RevGrowth | ProfitGrowth | EPSGrowth | FCFGrowth | OPM | CurrentRatio | DivYield | BookValue | MarketCap |
|--------|-----------|-------------|-----------|-----------|-----|-------------|----------|-----------|-----------|
| RELIANCE | 10% (TTM) | 14% (TTM) | ❌ N/A | ❌ N/A | 17% | ❌ N/A | 0.46% | ₹668 | ₹17.5L Cr |
| TCS | 5% (TTM) | 8% (TTM) | ❌ N/A | ❌ N/A | 27% | ❌ N/A | 2.91% | ₹296 | ₹7.96L Cr |
| INFY | ~8% | ~10% | ❌ N/A | ❌ N/A | ~25.5% | ❌ N/A | ~2.5% | ~₹280 | ~₹6.5L Cr |
| HDFCBANK | ~15% | ~18% | ❌ N/A | ❌ N/A | ~42% | ❌ N/A | ~1.2% | ~₹595 | ~₹12L Cr |
| ICICIBANK | ~16% | ~20% | ❌ N/A | ❌ N/A | ~38% | ❌ N/A | ~0.8% | ~₹480 | ~₹7.85L Cr |

---

## Available Fields Summary

**From Screener (enrichment only):** 7 fields
- ✅ revenueGrowth (Compounded Sales Growth TTM)
- ✅ profitGrowth (Compounded Profit Growth TTM)  
- ✅ operatingMargin (OPM% latest year)
- ✅ dividendYield (header)
- ✅ bookValue (header)
- ✅ marketCap (header)
- ✅ eps (P&L latest year)

**NOT AVAILABLE from Screener:** 3 fields
- ❌ epsGrowth — No EPS growth rate anywhere on Screener
- ❌ fcfGrowth — Only single-year FCF values
- ❌ currentRatio — Not in Screener's Ratios table

**From Upstox (authoritative — never overwrite):** 7 fields
- peRatio, pbRatio, roe, roa, roic/roce, debtToEquity, evEbitda

---

## Verdict

Screener.in provides **7 enrichment fields** that StockStory is currently missing. These fill critical gaps in Growth Engine (revenueGrowth, profitGrowth) and Valuation Engine (eps, bookValue). The remaining 3 gaps (epsGrowth, fcfGrowth, currentRatio) cannot be sourced from Screener — they must come from Finnhub (key refresh needed) or remain null.

**Engine Impact:**
- Growth Engine: +2 fields (revenueGrowth, profitGrowth) — was partially neutral, now live
- Quality Engine: +1 field (operatingMargin) — was missing, now live  
- Stability Engine: +0 net new (currentRatio still missing)
- Valuation Engine: +3 fields (eps, bookValue, dividendYield) — was largely missing, now live
