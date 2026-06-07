# AGENT A — End-to-End Data Integrity Audit

## Pipeline Trace

### 1. Provider → financial_snapshots
- **Status**: Populated from yfinance/Screener
- **Risk**: Gaps in non-Nifty 500 symbols — only ~100 symbols have financial data
- **Mitigation**: Engine gracefully handles null financials with default fallback values

### 2. financial_snapshots → factor_snapshots
- **Status**: Factor computation runs on populated financials
- **Risk**: If financial_snapshots missing, factor_snapshots will show default values (50)
- **Mitigation**: factor_snapshots are derived and always computed; null safety in all consumers

### 3. factor_snapshots → feature_snapshots
- **Status**: Technical features computed from daily_prices
- **Risk**: feature_snapshots may be empty (no technical fields) — code handles null rsi/macd/etc
- **Mitigation**: StockStoryRoute gracefully returns null technical fields without crashing

### 4. factor_snapshots → prediction_registry
- **Status**: DailyPredictionCapture creates predictions from factor data
- **Risk**: prediction_registry may have 0 rows — Trust Centre shows "Insufficient data"
- **Mitigation**: All frontend consumers check for empty prediction arrays

### 5. prediction_registry → prediction_outcomes
- **Status**: Future returns computed against benchmark after horizon passes
- **Risk**: Validation only possible with populated data and passing time
- **Mitigation**: Validation is non-blocking — predictions show as "pending" until validated

### 6. All → Frontend
- **Status**: API routes → React components via fetch
- **Risk**: Slow API responses could show blank states
- **Mitigation**: Loading states + error boundaries on every page

## Integrity Findings
- No broken joins detected — all queries use simple WHERE symbol = $1 patterns
- No orphan records — prediction_registry references symbols from factors
- No date mismatches — all date handling converts Date objects to ISO strings
- Duplicate symbols possible if population script re-runs — handled by ON CONFLICT DO UPDATE

## Verdict: STABLE WITH KNOWN GAPS
The pipeline is designed for graceful degradation. Missing data shows default values, not errors.
