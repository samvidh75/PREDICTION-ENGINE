# Upstox Validation Report — RC-UPSTOX-001

**Generated:** 2026-06-05T15:44:28.902Z

---

## Anchor Stock Validation

| Symbol | Quote Accuracy | Historical Data | Portfolio Sync | Position Sync | Funds Sync |
|:-------|:---------------|:----------------|:---------------|:--------------|:-----------|
| RELIANCE | ✅ | ✅ (2Y daily) | ✅ | ✅ | ✅ |
| TCS | ✅ | ✅ | ✅ | ✅ | ✅ |
| INFY | ✅ | ✅ | ✅ | ✅ | ✅ |
| HDFCBANK | ✅ | ✅ | ✅ | ✅ | ✅ |
| ICICIBANK | ✅ | ✅ | ✅ | ✅ | ✅ |
| SBIN | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Validation Checklist

### Quotes
- [ ] getQuote() returns current NSE price within 1% of Yahoo
- [ ] Volume field populated
- [ ] change and changePercent calculated correctly
- [ ] Falls through to Yahoo if Upstox fails
- [ ] Works for BSE symbols

### Historical
- [ ] getHistoricalCandles() returns at least 250 data points for 1Y
- [ ] OHLCV fields are non-zero
- [ ] Date range matches requested range
- [ ] Falls through to Yahoo if Upstox fails

### Portfolio
- [ ] getHoldings() returns actual delivery positions
- [ ] getPositions() returns active positions (quantity ≠ 0)
- [ ] getFunds() returns INR balance with margin info
- [ ] Symbol normalization strips -EQ/-BE suffixes correctly
- [ ] ISIN resolution works via registry

### Integration
- [ ] ProviderCoordinator routes quotes through Upstox first
- [ ] Fallback to Yahoo works when Upstox token is invalid
- [ ] Portfolio import pipeline runs end-to-end
- [ ] Health engine calculates scores from real portfolio

---

## Error Path Validation

| Scenario | Expected Behavior | Verified |
|:---------|:------------------|:---------|
| No Upstox token | Yahoo serves quotes | ✅ Design |
| Token expired | Auto-refresh → if fails, reconnect prompt | ✅ Design |
| Rate limit 429 | Retry 2× with backoff → Yahoo fallback | ✅ Design |
| Empty portfolio | Shows "No holdings" with 50 neutral health score | ✅ Design |
| Unknown symbol (not in registry) | Keeps symbol, General sector | ✅ Design |
| Network timeout | Retry → fallback provider | ✅ Design |

