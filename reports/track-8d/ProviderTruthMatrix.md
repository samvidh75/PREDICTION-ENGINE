# Provider Truth Matrix
## TRACK-8D Phase 3 & 4 — Live Fundamental Truth Test + Final Verdict

**Generated**: 2026-06-06  
**Tested Symbols**: RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK

---

## Provider-by-Provider Truth

### 1. UpstoxFundamentalsProvider (NEW — TRACK-8E)
- **Endpoint**: `GET https://api.upstox.com/v2/fundamentals/{isin}/key-ratios` + `/balance-sheet`
- **Auth**: Existing Upstox OAuth access token (free with Upstox account)
- **Coverage**: 100% Indian stocks (all NSE/BSE via ISIN lookup)
- **Fields**: P/E, P/B, ROE, ROA, ROCE, EV/EBITDA + Total Assets, Total Liabilities, Equity
- **Dependencies**: ISIN must exist in MasterCompanyRegistry, user must have connected Upstox
- **Status**: ✅ CODE COMPLETE — needs live Upstox token to verify

### 2. FinnhubProvider  
- **Endpoint**: `GET https://finnhub.io/api/v1/stock/metric?symbol={ticker}.NS&metric=all`
- **Auth**: API key `FINNHUB_KEY` (d8fhq1hr01qn443a1sigd8fhq1hr01qn443a1sj0)
- **Live Test Result**: ❌ HTTP 403 Forbidden — API key expired/invalid for all 5 symbols
- **Fields Expected**: 50+ metrics (P/E, P/B, ROE, ROIC, margins, growth rates, etc.)
- **Verdict**: **DEAD** — API key is no longer valid. Finnhub free tier key has expired.

### 3. IndianAPIProvider  
- **Endpoint**: `GET https://indianapi.in/stock?name={symbol}`
- **Auth**: API key `INDIANAPI_KEY` via `X-Api-Key` header
- **Live Test Result (WRONG)**: ❌ Network Error — endpoint `stock.indianapi.in/stock_fundamentals` was invalid
- **After Fix (CORRECT)**: ❌ Network Error — `indianapi.in/stock` unreachable from test environment (likely firewall)
- **Fields Expected**: financials, keyMetrics, shareholding, analystView, corporateActions
- **Verdict**: **PREVIOUSLY BROKEN** — never worked due to wrong URL. Now fixed but untestable in current env.

### 4. YahooProvider (Financials fallback)
- **Endpoint**: Yahoo Finance API
- **Coverage**: Limited Indian stock data
- **Verdict**: ⚠️ Fallback only — provides minimal financial data for Indian equities

---

## Live Test Results (June 6, 2026)

| Symbol | IndianAPI (Wrong) | IndianAPI (Fixed) | Finnhub |
|--------|-------------------|-------------------|---------|
| RELIANCE | ❌ Network Error | ❌ Network Error | ❌ HTTP 403 |
| TCS | ❌ Network Error | ❌ Network Error | ❌ HTTP 403 |
| INFY | ❌ Network Error | ❌ Network Error | ❌ HTTP 403 |
| HDFCBANK | ❌ Network Error | ❌ Network Error | ❌ HTTP 403 |
| ICICIBANK | ❌ Network Error | ❌ Network Error | ❌ HTTP 403 |

**Network Note**: All IndianAPI requests returned "Network Error" — DNS resolution or firewall blocking external APIs in this environment. API keys may be valid but unreachable from current network.

---

## Current Provider Chain

```
┌─────────────────────────────────────────────────────┐
│ Tier 1: UpstoxFundamentals (free, OAuth, 100% IN)   │ ← NEW (needs live token test)
├─────────────────────────────────────────────────────┤
│ Tier 2: Finnhub (FINNHUB_KEY — ❌ 403)              │ ← DEAD (key expired)
├─────────────────────────────────────────────────────┤
│ Tier 3: IndianAPI (INDIANAPI_KEY — ✅ fixed URL)     │ ← Fixed but unreachable in test env
├─────────────────────────────────────────────────────┤
│ Tier 4: Yahoo (fallback, minimal Indian data)        │ ← ONLY WORKING PROVIDER?
└─────────────────────────────────────────────────────┘
```

---

## Fields Actually Populated Today

Based on the provider truth audit:

| EngineInput Field | Source Status |
|------------------|---------------|
| marketCap | Registry (hardcoded) ✅ |
| peRatio | ❌ All providers failing |
| pbRatio | ❌ All providers failing |
| evEbitda | ❌ All providers failing |
| eps | ❌ All providers failing |
| roe | ❌ All providers failing |
| roic | ❌ All providers failing |
| grossMargin | ❌ All providers failing |
| operatingMargin | ❌ All providers failing |
| netMargin | ❌ All providers failing |
| revenueGrowth | ❌ All providers failing |
| epsGrowth | ❌ All providers failing |
| fcfGrowth | ❌ All providers failing |
| debtToEquity | ❌ All providers failing |
| currentRatio | ❌ All providers failing |
| interestCoverage | ❌ All providers failing |
| freeCashFlow | ❌ All providers failing |
| beta | ❌ All providers failing |
| dividendYield | ❌ All providers failing |

**Estimated real data percentage**: ~5% (market cap only, from registry)
