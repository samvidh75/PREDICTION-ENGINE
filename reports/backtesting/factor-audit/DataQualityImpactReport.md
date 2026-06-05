# Data Quality Impact Report — Factor Quality Audit

**Generated:** 2026-06-05T10:42:41.062Z

---

## Impact Assessment

| Dimension | Status | Severity |
|:----------|:-------|:---------|
| **Real financial data used** | ❌ None — all inputs are hardcoded neutrals | 🔴 Critical |
| **Scores driven by defaults** | ✅ 100% — every feature defaults to 50 | 🔴 Critical |
| **Scores driven by inferred values** | ✅ Yes — PE, ROE, growth rates are all inferred as "reasonable" defaults | 🔴 Critical |
| **Real financial data exists?** | ⚠️ Not loaded into backtesting | 🟡 Needs fix |

### What's Happening

```
buildEngineInputs() function in backtesting:
    peRatio: 20          ← hardcoded, not from financial statements
    roe: 0.12            ← hardcoded
    revenueGrowth: 0.08  ← hardcoded
    debtToEquity: 0.5    ← hardcoded
    ...
```

Every company gets identical financials. The engines score them identically → all factor scores cluster around 50 → no predictive differentiation.

### What Would Fix It

| Fix | Effort | Impact |
|:----|:-------|:-------|
| Load real PE, ROE, revenue growth from financial statement data | Medium | 🔴 Highest |
| Use actual current ratios, debt/equity from balance sheets | Medium | 🔴 High |
| Fetch real technicals (RSI, MACD from price history) | Low-Medium | 🟡 Medium |
| Keep sector-based weighting (it's fine) | None | — |

### Conclusion

**The weak predictive robustness seen in TRACK-6A/B/C is caused by missing financial data, not by poor engine design or weighting.** The engines themselves are structurally sound — they correctly handle null values, use sector-adaptive thresholds, and produce well-scaled 0-100 scores. They simply need real data to differentiate between companies.

