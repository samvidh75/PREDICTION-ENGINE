# Provider Cost Analysis — TRACK-7F

**Generated:** 2026-06-05T13:00:00Z
**Target:** 500-company Indian equity universe with daily refresh of 21 financial fields

---

## Cost Per Tier (Monthly)

| Provider | Free Tier | Starter Tier | Pro/Ultimate Tier | Calls/Min at Pro | India Financials | Annual Cost (Pro) |
|:---------|:----------|:-------------|:-------------------|:-----------------|:-----------------|:------------------|
| FMP | 250/day | $22/mo | $149/mo (Ultimate) | 3,000/min | ✅ Global at Ultimate | ~$1,788 |
| Alpha Vantage | 25/day (free) | $49.99/mo (Premium) | $99.99/mo (Pro) | 300/min | ❌ US-only at all tiers | N/A |
| Polygon | 5/min (free) | $29/mo (Starter) | $79/mo (Advanced) | Unlimited | ❌ No NSE/BSE | N/A |
| Tiingo | 1,000/mo (free) | $10/mo (Starter) | $50/mo (Pro) | N/A (monthly limit) | ❌ No Indian tickers | N/A |
| IndianAPI | 100/day (free, no fundamentals) | Rs. 999/mo (~$12/mo) | Rs. 4,999/mo (~$60/mo) | 10,000/day | ✅ Full NSE/BSE | ~$144 |
| Yahoo Finance | No API key required | FREE | FREE | ~500/hr (informal) | ✅ Full NSE/BSE (.NS, .BO) | $0 |

---

## Cost to Cover 500 Indian Companies

Assuming each company requires 1 API call for fundamentals (single endpoint returning all fields):

| Provider | Tier Required | Calls Needed | Rate Limit | Batch Time | Monthly Cost | Annual Cost |
|:---------|:-------------|:-------------|:-----------|:-----------|:-------------|:------------|
| FMP | Ultimate | 500 | 3,000/min | < 1 min | $149 | $1,788 |
| Alpha Vantage | N/A (fundamentals US-only) | 0 | — | — | $0 (not viable) | $0 |
| Polygon | N/A (no India) | 0 | — | — | $0 (not viable) | $0 |
| Tiingo | N/A (no India) | 0 | — | — | $0 (not viable) | $0 |
| IndianAPI | Starter (Rs. 999/mo) | 500 | 2,000/day — sufficient | ~8 min (1 call/sec) | ~$12 | ~$144 |
| Yahoo Finance | FREE | 500 | ~500/hr (informal) | ~60 min (throttled) | $0 | $0 |

---

## Cost Comparison Summary

| Provider | Annual Cost | Coverage % | Cost per 1% Coverage | Verdict |
|:---------|:------------|:-----------|:---------------------|:--------|
| FMP | ~$1,788 | 90% | ~$19.87/% | 💰 Expensive but most comprehensive |
| IndianAPI | ~$144 | 55% | ~$2.62/% | 💵 Very affordable, India-native |
| Yahoo | $0 | 75% | $0.00/% | 🆓 Free, good coverage, already integrated |
| Finnhub (current) | Gated by premium key | 100% (endpoint built) | Depends on premium key cost | 🔑 Single missing piece |

---

## Cost-Benefit Analysis

### Scenario 1: Yahoo Only (Recommended Minimum)
- **Cost:** $0/month
- **Coverage:** ~75% (16/21 fields)
- **Time to live:** 1 week (5 dev hours)
- **Engines activated:** Growth (revenue growth, EPS growth), Quality (ROE, margins), Stability (D/E, current ratio), Valuation (PE, PB, EV/EBITDA), Risk (beta, FCF)
- **Remaining gaps:** ROIC, FCF Growth, Profit Growth, Interest Coverage (4 fields)

### Scenario 2: Yahoo + IndianAPI (Recommended Production)
- **Cost:** ~$12/month
- **Coverage:** ~85% (18/21 fields)
- **Time to live:** 2 weeks (11 dev hours)
- **Engines activated:** All 5 engines with near-complete data
- **Remaining gaps:** FCF Growth, Interest Coverage (2 fields — derivable)

### Scenario 3: Finnhub Premium (Future Gold Standard)
- **Cost:** Premium key cost (varies by tier)
- **Coverage:** 100% (21/21 fields)
- **Time to live:** Immediate (0 dev hours — already implemented)
- **Engines activated:** All 5 engines with complete data
- **Remaining gaps:** None

### Scenario 4: FMP Ultimate
- **Cost:** $149/month ($1,788/year)
- **Coverage:** ~90% (19/21 fields)
- **Time to live:** 1 week (8 dev hours)
- **Engines activated:** All 5 engines
- **Remaining gaps:** Beta (can use Yahoo), FCF Growth, Profit Growth (partial)

---

## Key Insight

The **Yahoo quoteSummary endpoint** provides ~75% of required fields at **zero additional cost** because:
1. YahooProvider already exists in the codebase (used for price history)
2. No API key management needed (informal rate limit only)
3. Same `.NS` symbol format already in use
4. PE, PB, ROE, D/E, Beta, Market Cap, EPS, Revenue Growth, FCF, EV/EBITDA, Dividend Yield are all available via `quoteSummary` modules

**Remaining gaps (~25% of fields):** ROIC, FCF Growth, Profit Growth, Interest Coverage, and detail breakdowns of Gross/Operating Margins. These can be:
- Derived from multi-year Yahoo financial data
- Supplemented with IndianAPI at ~$12/mo
- Eventually filled by Finnhub premium (already implemented)

---

## Recommendation by Budget

| Budget | Best Option | Coverage | Annual Cost | Dev Hours |
|:-------|:------------|:---------|:------------|:----------|
| $0 (zero cost) | Yahoo only | ~75% | $0 | 5 hours |
| Under $20/mo | Yahoo + IndianAPI Starter | ~85% | $144 | 11 hours |
| Under $200/mo | FMP Ultimate | ~90% | $1,788 | 8 hours |
| Flexible | Finnhub Premium (future) | 100% | Varies | 0 hours |
