# TRACK-36 AGENT 4: Fundamental Coverage
**Generated:** 2026-06-06T19:19:22.609Z

## Field Sources & Mapping
| Field | Provider Source | Mapping Logic | DB Coverage |
|-------|----------------|---------------|-------------|
| pe_ratio | UpstoxFundamentals / Yahoo | Direct from provider | DB unreachable |
| pb_ratio | UpstoxFundamentals / Screener | Direct from provider | DB unreachable |
| roe | UpstoxFundamentals / Finnhub | net_income / total_equity (if not direct) | DB unreachable |
| roic | UpstoxFundamentals / Finnhub | nopat / invested_capital | DB unreachable |
| roa | Derived / Upstox | net_income / total_assets | DB unreachable |
| debt_to_equity | UpstoxFundamentals / Screener | total_liabilities / total_equity | DB unreachable |
| current_ratio | Screener | current_assets / current_liabilities | DB unreachable |
| eps | UpstoxFundamentals / Yahoo | Direct from provider | DB unreachable |
| revenue_growth | DerivedMetricsEngine / Screener | (curr - prev) / prev | DB unreachable |
| eps_growth | DerivedMetricsEngine / Screener | (curr - prev) / prev | DB unreachable |
| fcf_yield | DerivedMetricsEngine | fcf / market_cap | DB unreachable |
| gross_margin | Screener / Derived | gross_profit / revenue | DB unreachable |
| operating_margin | Screener / Derived | operating_income / revenue | DB unreachable |
| ev_ebitda | UpstoxFundamentals / Finnhub | Direct from provider | DB unreachable |
| dividend_yield | Yahoo / Screener | Direct from provider | DB unreachable |
| beta | Yahoo | Direct from provider | DB unreachable |
| market_cap | Yahoo / Upstox | price * shares_outstanding | DB unreachable |
| free_float | Derived | From shareholding pattern or free_float | DB unreachable |
| profit_growth | DerivedMetricsEngine | (curr - prev) / prev | DB unreachable |
| fcf_growth | DerivedMetricsEngine | (curr - prev) / prev | DB unreachable |


## Verdict: **DB_UNREACHABLE — cannot audit fundamental coverage**
