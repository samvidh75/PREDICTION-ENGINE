# Agent F: Institutional Provenance Audit

## Signal Source Audit

| Signal | Source | Status |
|--------|--------|--------|
| Promoter Holdings | NOT COLLECTED | ❌ Disabled — no data source |
| FII Flows | NOT COLLECTED | ❌ Disabled — no data source |
| DII Flows | NOT COLLECTED | ❌ Disabled — no data source |
| Mutual Fund Activity | NOT COLLECTED | ❌ Disabled — no data source |
| ROE | Screener.in (scraped) | ✅ Real source |
| ROCE | Screener.in (scraped) | ✅ Real source |
| PE Ratio | Screener.in (scraped) | ✅ Real source |
| Book Value | Screener.in (scraped) | ✅ Real source |
| Dividend Yield | Screener.in (scraped) | ✅ Real source |
| Price History | Yahoo Finance v8 API | ✅ Real source |
| Features (RSI, MACD) | Computed from prices | ✅ Derived |
| Factors (Quality/Growth) | Computed from features | ✅ Derived |
| Rankings | Computed from factors | ✅ Derived |
| Predictions | Computed from rankings | ✅ Derived |

### Critical Gap
**Promoter, FII, DII, MF data is NOT available.** Any future engine claiming institutional intelligence MUST disable itself until real data sources are connected. Current engines do NOT make institutional claims.

✅ All current signals have real provenance. No inferred institutional signals.
