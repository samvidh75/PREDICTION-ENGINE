# Provider Priority Report — RC-UPSTOX-001

**Generated:** 2026-06-05T15:44:28.889Z

---

## Updated Provider Chains

### Quotes

| Priority | Provider | Fallback Trigger | Cost |
|:---------|:---------|:-----------------|:-----|
| Tier 1 | **UpstoxProvider** | 401 (token expired), 429 (rate limited), timeout | $0 (with trading account) |
| Tier 2 | YahooProvider | 429, timeout, API outage | $0 |
| Tier 3 | Registry | All providers failed — returns last known price | $0 |

### Historical Data

| Priority | Provider | Range Support | Cost |
|:---------|:---------|:--------------|:-----|
| Tier 1 | **UpstoxProvider** | 1D through 5Y (daily candles) | $0 |
| Tier 2 | YahooProvider | 1D through 10Y (v8 chart API) | $0 |

### Fundamentals

| Priority | Provider | Coverage | Cost |
|:---------|:---------|:---------|:-----|
| Tier 1 | FinnhubProvider | 21 financial fields | Free tier (60 calls/min) |
| Tier 2 | Yahoo (v8) | Beta derivation only | $0 |
| Future | IndianAPI | +10% India coverage | ~$12/mo |

### Metadata

| Priority | Provider | Priority | Cost |
|:---------|:---------|:---------|:-----|
| Tier 1 | MasterCompanyRegistry | Local JSON, always available | $0 |
| Tier 2 | YahooProvider | v8 chart meta (name, exchange) | $0 |
| Tier 3 | FinnhubProvider | profile2 endpoint | Free tier |

### Portfolio

| Priority | Provider | Data | Cost |
|:---------|:---------|:-----|:-----|
| Tier 1 | **UpstoxProvider** | Holdings, positions, funds, orders | $0 |

---

## Provider Changes Summary

| Change | Before | After |
|:-------|:-------|:------|
| Upstox added to Quotes | Not in chain | Tier 1 |
| Upstox added to Historical | Not in chain | Tier 1 |
| Yahoo downgraded (Quotes) | Tier 1 | Tier 2 |
| Yahoo downgraded (Historical) | Tier 1 | Tier 2 |
| IndianMarket removed | Tier 2 | ❌ Removed |
| AlphaVantage removed | Tier 3 | ❌ Removed |

---

## Fallback Behavior

### Scenario: Upstox token expired
```
getQuote('RELIANCE')
  → UpstoxProvider: 401 "token expired"
  → YahooProvider:    200 success
  → Result: Yahoo quote (with fallback indicator)
```

### Scenario: User not connected to Upstox
```
getQuote('RELIANCE')
  → UpstoxProvider: "not authenticated" (skipped)
  → YahooProvider:    200 success
  → Result: Yahoo quote (no Upstox available)
```

### Scenario: Both Upstox and Yahoo fail
```
getQuote('RELIANCE')
  → UpstoxProvider: timeout
  → YahooProvider:   429 rate limit
  → Result: Error "All providers failed"
```

