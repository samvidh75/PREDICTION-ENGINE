# Agent A — Data Automation Matrix

## Verdict: PARTIAL AUTOMATION

## Source Audit
### Screener.in (MANUAL/MISSING)
- **Tables**: financial_snapshots, quality_registry, statements
- **Rows**: 90
- **Automation**: Python web scraper (track46_agentA_v2.cjs) exists but not cron-scheduled
- **Failure Modes**: `Rate limiting (429)`, `HTML structure changes`, `No real-time updates`
- **Replacements**: `BSE/NSE official APIs`, `Paid: Tijori Finance API`, `Free: yfinance fundamentals`
- **Recommendation**: **SCRAPER_PYTHON — Migrate Screener data collection to yfinance Python bridge if rate limits permit**

### Yahoo Finance (PARTIALLY_AUTOMATED)
- **Tables**: daily_prices
- **Rows**: 37,140
- **Automation**: yfinance Python bridge (scripts/yfinance_bridge.py), 30 symbols populated, not cron-scheduled
- **Failure Modes**: `Rate limiting (429)`, `Cookie/crumb expiration`, `Yahoo API deprecation`, `Weekend/holiday gaps`
- **Replacements**: `Finnhub (API key required, ~60 calls/min free)`, `Alpha Vantage (5 calls/min free)`, `Paid: Twelve Data / Polygon`
- **Recommendation**: **KEEP_YFINANCE — Already populated 37,140 rows. Schedule daily cron for price updates. Add Finnhub as fallback.**

### NSE (NOT_INTEGRATED)
- **Tables**: none
- **Rows**: 0
- **Automation**: None — NSE API requires authorization
- **Failure Modes**: `API auth changes`, `Paywall`, `IP blocking`
- **Replacements**: `Finnhub/Alpha Vantage cover NSE stocks`, `yfinance .NS suffix works for NSE`
- **Recommendation**: **SKIP — yfinance .NS suffix already covers NSE equities. No marginal value from direct NSE integration.**

### Manual CSV Imports (EMPTY)
- **Tables**: benchmark_observations, master_security_registry
- **Rows**: 0
- **Automation**: None — never populated
- **Failure Modes**: `Human error`, `Format drift`, `Forgotten updates`
- **Replacements**: `NIFTY 50 benchmark: calculate from yfinance ^NSEI`, `Security master: derive from quality_registry + symbols table`
- **Recommendation**: **ELIMINATE — Compute benchmark returns from yfinance and security attributes from existing populated tables.**

### Internal Tables (symbols) (POPULATED)
- **Tables**: symbols
- **Rows**: 30
- **Automation**: Manually curated 30 symbols, needs expansion script
- **Failure Modes**: `Stale list`, `Missing NIFTY constituents`
- **Replacements**: `NIFTY 100 constituent list from NSE website → automate via scraper`
- **Recommendation**: **EXPAND — Build NIFTY100 symbol scraper (Agent B).**

## Summary
| Metric | Value |
|--------|-------|
| Total Sources | 5 |
| Fully Automated | 1 |
| Partially Automated | 1 |
| Manual/Blocked | 2 |
| Total Data Rows | 806,163 |
| Zero Manual Target | NEEDS WORK |

## Action Items for 0 Manual Data Entry
1. **Schedule yfinance cron** — daily price updates for all 30+ symbols
2. **Expand universe** — Agent B builds NIFTY100 population
3. **Eliminate CSV imports** — compute benchmark from yfinance ^NSEI
4. **No NSE integration needed** — yfinance .NS covers NSE stocks
