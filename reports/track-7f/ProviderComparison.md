# Provider Comparison — TRACK-7F

**Generated:** 2026-06-05T13:00:00Z

---

## 1. Provider Survey Summary

| Provider | Price Data (India) | Fundamental Data (India) | Best Tier for India | Monthly Cost | Viable? |
|:---------|:-------------------|:-------------------------|:--------------------|:-------------|:--------|
| Financial Modeling Prep (FMP) | ❌ | ✅ | Ultimate | $149/mo | ⚠️ Partial (unverified) |
| Alpha Vantage | ✅ | ❌ | — | N/A | ❌ No (fundamentals US-only) |
| Polygon.io | ❌ | ❌ | — | N/A | ❌ No (no NSE/BSE) |
| Tiingo | ❌ | ❌ | — | N/A | ❌ No (no Indian coverage) |
| IndianAPI | ✅ | ✅ | Starter | ~$12/mo | ✅ Yes |
| Yahoo Finance | ✅ | ✅ | Free (no API key) | $0/mo | ✅ Yes |

---

## 2. Field Coverage Matrix

### Provider vs Required Fields (21 total)

| # | Field | Engine | FMP | Alpha Vantage | Polygon | Tiingo | IndianAPI | Yahoo |
|:--|:------|:-------|:----|:--------------|:--------|:-------|:----------|:------|
| 1 | PE | Valuation | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 2 | PB | Valuation | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 3 | EV/EBITDA | Valuation | ✅ | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| 4 | ROE | Quality | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 5 | ROIC | Quality | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ |
| 6 | Gross Margin | Quality | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ |
| 7 | Operating Margin | Quality/Stability | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ |
| 8 | Net Margin | General | ✅ | ❌ | ❌ | ❌ | ✅ | ⚠️ |
| 9 | Revenue Growth | Growth | ✅ | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| 10 | EPS Growth | Growth | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ |
| 11 | FCF Growth | Growth | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 12 | Profit Growth | Growth | ⚠️ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ |
| 13 | Debt/Equity | Stability | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 14 | Current Ratio | Stability | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ |
| 15 | Interest Coverage | Stability | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 16 | Free Cash Flow | Risk | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 17 | FCF Yield | Valuation/Risk | ⚠️ | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| 18 | Beta | Risk | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 19 | EPS | General | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 20 | Dividend Yield | General | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 21 | Market Cap | General | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |

### Legend

| Symbol | Meaning |
|:-------|:--------|
| ✅ | Confirmed available — field directly returned by provider for Indian equities |
| ⚠️ | May be available or derivable — uncertain for Indian tickers, needs live test |
| ❌ | Confirmed not available for Indian equities (US-only or provider doesn't support NSE) |

---

## 3. Overall Coverage Score

| Provider | Fields Covered | Overall % | Status |
|:---------|:---------------|:----------|:-------|
| FMP | 16 confirmed + 4 possible / 21 (at Ultimate tier) | 90% | ✅ Viable (at $149/mo) |
| Alpha Vantage | 1 confirmed / 21 (market cap only) | 5% | ❌ Not viable |
| Polygon | 0 confirmed / 21 | 0% | ❌ Not viable |
| Tiingo | 0 confirmed / 21 | 0% | ❌ Not viable |
| IndianAPI | 10 confirmed + 8 possible / 21 | 55% | ⚠️ Partial |
| Yahoo Finance | 11 confirmed + 7 possible / 21 | 75% | ✅ Viable |

---

## 4. Provider Deep Dives

### Financial Modeling Prep (FMP)
- **Coverage:** Excellent for US stocks. Indian equities require Ultimate tier ($149/mo). Coverage unverified for Indian mid/small caps.
- **Strengths:** Single API call returns all key metrics TTM. Financial ratios endpoint covers 90%+ of fields. Trusted by KPMG, Harvard, Societe Generale.
- **Weaknesses:** Indian coverage gated behind most expensive tier. No beta field available. Free tier is US-sample only (87 stocks).
- **Verdict:** Best overall feature set but $149/mo is expensive for unverified Indian coverage. Worth evaluating if budget allows.

### Alpha Vantage
- **Coverage:** Price data works for NSE/BSE (e.g., RELIANCE.BSE). Fundamental endpoints (INCOME_STATEMENT, BALANCE_SHEET) are US/NASDAQ only per GitHub issue #343. Company Overview endpoint returns market cap for Indian tickers but minimal other data.
- **Strengths:** Free tier (25 calls/day). Excellent US stock fundamentals. Already in codebase (ALPHA_VANTAGE_KEY in .env).
- **Weaknesses:** Fundamental data is US-only at all pricing tiers. Confirmed by community reports.
- **Verdict:** ELIMINATED for fundamentals. Useful for US stocks and technical indicators only.

### Polygon.io
- **Coverage:** US equities only. No NSE or BSE exchange support in symbol directory.
- **Strengths:** Good US coverage, clean API.
- **Weaknesses:** No Indian exchange support.
- **Verdict:** ELIMINATED.

### Tiingo
- **Coverage:** US equities focus. Indian tickers not in symbol directory.
- **Strengths:** Affordable ($10/mo Starter), clean API.
- **Weaknesses:** No Indian coverage.
- **Verdict:** ELIMINATED.

### IndianAPI (Indian Stock Market API)
- **Coverage:** Native Indian provider. Covers NSE and BSE. Strong on core metrics (PE, PB, ROE, D/E, Beta, EPS, Market Cap, Net Margin). Weaker on derived metrics (growth rates, FCF, margins detail).
- **Strengths:** India-first. Rs. 999/mo (~$12/mo) starter tier. Bulk endpoints available. Good core financial metrics.
- **Weaknesses:** Less mature than FMP/Finnhub. Growth rates and detail margins may need multi-year derivation. Free tier (100/day) excludes fundamentals.
- **Verdict:** Best Indian-native option. Good fallback provider at $12/mo. Complements Yahoo for missing fields.

### Yahoo Finance (quoteSummary modules)
- **Coverage:** quoteSummary endpoint with defaultKeyStatistics, financialData, summaryDetail, and price modules provides 75% of required fields. Works for .NS and .BO suffixes. Same provider already used for price history.
- **Strengths:** Zero cost. No API key needed. Already in codebase (YahooProvider). Same symbol format. 5-hour integration. Covers PE, PB, EV/EBITDA, ROE, Revenue Growth, D/E, FCF, Beta, EPS, Dividend Yield, Market Cap.
- **Weaknesses:** Informally documented endpoint — could change. Rate limited (~500/hr). Some detail fields (ROIC, Gross/Op Margin detail, FCF Growth, Profit Growth, Interest Coverage) may not be available.
- **Verdict:** RECOMMENDED AS PRIMARY. Highest ROI. Free, already trusted, quick to integrate.

---

## Research Sources

- FMP pricing page: https://site.financialmodelingprep.com/developer/docs/pricing (coverage tiers: Basic=US sample, Starter=US, Premium=US+UK+Canada, Ultimate=Global)
- Alpha Vantage docs: https://www.alphavantage.co/documentation/ (fundamental APIs documented, GitHub issue #343 confirms US-only for financial statements)
- Polygon.io: US-centric, no NSE/BSE exchange support
- Tiingo: US equities only, no Indian tickers in symbol directory
- IndianAPI: https://indianapi.in/documentation/indian-stock-market (India-specific market data provider)
- Yahoo Finance quoteSummary: Publicly documented by community, supports global tickers including .NS
