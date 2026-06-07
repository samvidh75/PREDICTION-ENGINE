# AGENT G — NIFTY100 Expansion Execution

## Current State
Symbols table populated from earlier data population runs. Exact count unknown — needs verification.

## Target
100 NSE symbols with:
- Daily price data (5+ years)
- Financial snapshots (quarterly)
- Factor snapshots (daily computed)
- Feature snapshots (technical indicators)

## Required Tables (per symbol)
| Table | Target Rows | Purpose |
|-------|-------------|---------|
| symbols | 100 | Security master |
| daily_prices | ~1250/symbol (5yr × 250 days) | Price history |
| financial_snapshots | ~20/symbol (5yr × 4 quarters) | Fundamental data |
| factor_snapshots | ~1250/symbol | Factor scores |
| feature_snapshots | ~1250/symbol | Technical indicators |

## Estimated Totals
- 150,000+ daily price rows
- 100,000+ factor snapshots
- 2,000+ financial snapshots
- 100+ symbol registrations

## Population Scripts
Existing population scripts: yfinance_bridge.py, track44_data_populate.cjs, track38-populate.cjs

## Verification
Run db-health.cjs to verify row counts after population. Target: symbols table has 100+ rows with sector mappings.
