# Report 29: Automatic Fundamentals and Public Provider Productionization

## Baseline Commit
`bd3a9eb0` — Phase 2: Dhan/Upstox/Finnhub removal + public NSE provider architecture

## Current Provider Inventory Before

| Provider | Status | Purpose |
|----------|--------|---------|
| IndianAPI | Active (optional key) | Quotes, metadata, history |
| Yahoo Finance | Active fallback | Quotes, historical OHLCV |
| nselib | Planned | Would provide financial results, index, bhavcopy |
| nsepython | Operator tool | Nifty 50 quote, index data |
| Dhan | Removed | — |
| Upstox | Removed | — |
| Finnhub | Removed | — |

## Missing/Gap Analysis

| Domain | Requirement | Gap |
|--------|-------------|-----|
| Live quote | IndianAPI or public NSE | Yahoo blocked locally (429), IndianAPI needed |
| Historical OHLCV | Reliable provider | Yahoo blocked, DB has historic data for scored symbols |
| Bhavcopy/delivery | Public NSE | jugaad-data provides bhavcopy CSV locally |
| Index/sector | NSE constituents | nsepython provides Nifty 50 quote |
| Fundamentals | Automatic from public | nsepython.nse_results() returns empty; nselib needs Python 3.10+ |
| RBI/macro | Public source | jugaad-data RBI.current_rates() works locally |
| Market breadth | NSE advances/declines | jugaad-data market_status() works locally |

## Jugaad-Data Evaluation

- **Package**: jugaad-data v0.28 (pip install)
- **No credentials**: Confirmed — no secrets required
- **Local (Python 3.9)**: 5/6 domains healthy
  - package_import: ✅ healthy
  - stock_data_RELIANCE: ❌ python_version_incompatible (str.replace(day=1) needs 3.10+)
  - bhavcopy: ✅ healthy (returns CSV file path)
  - market_status: ✅ healthy (5 markets, market cap data)
  - rbi_rates: ✅ healthy (Policy Repo Rate, CRR, SLR, exchange rates)
  - all_indices: ✅ healthy (market breadth data)
- **Python 3.9 limitations**: stock_df and stock_quote broken
- **Status**: local_only/degraded — useful for bhavcopy + RBI + market status

## NSELib Production Check

- **Package**: nselib (pip install)
- **Python 3.9**: ❌ Import failed — PEP 604 union syntax (`|`) not supported
- **Python 3.10+**: Would provide financial_results_for_equity, bhav_copy, index constituents
- **Railway**: Requires Python 3.10+ runtime upgrade
- **Status**: unavailable on current Python 3.9

## NSEPython Production Check

- **Package**: nsepython v2.97 (pip install)
- **No credentials**: Confirmed
- **Local**: 4/7 probes healthy
  - module_import: ✅ healthy
  - nifty_quote: ✅ healthy (NIFTY 50 index quote: 25,682.40)
  - equity_quote_RELIANCE: ❌ NSE blocks equity endpoints
  - history_RELIANCE: ❌ NSE blocks equity endpoints
  - bhavcopy: ✅ healthy (3,266 rows for 17-06-2026)
  - financial_results_RELIANCE: ✅ healthy (but returns empty_no_data)
  - market_breadth: ❌ logger bug in nsepython
- **Useful for**: Nifty 50 index quote, bhavcopy data
- **Status**: degraded — only index quote and bhavcopy work reliably

## Yahoo Railway Diagnosis

- **DNS**: ✅ Resolves (27.123.42.205)
- **HTTPS**: ❌ HTTP 429 Too Many Requests (rate-limited)
- **Local**: blocked (429)
- **Railway**: Expected to be unreachable
- **User-Agent**: 429 returned regardless of UA
- **Status**: blocked/unreachable
- **Mitigation**: Public NSE providers provide backup
- **No evasion** used or committed

## Active Provider Precedence After Integration

| Domain | Primary | Secondary | Tertiary |
|--------|---------|-----------|----------|
| Quote | IndianAPI (if key) | Yahoo (blocked) | nsepython (degraded) |
| Historical | DB (existing) | Yahoo (blocked) | — |
| Bhavcopy | jugaad-data (local) | nsepython (local) | — |
| Index | nsepython | jugaad-data | DB registry |
| Fundamentals | CSV import/manual | — | — |
| Macro | jugaad-data RBI | — | — |

## Quote Coverage

- IndianAPI: configured = healthy, missing = degraded
- Yahoo: blocked from India (429)
- nsepython: equity quote blocked by NSE
- jugaad-data: stock_quote blocked by NSE
- **Result**: IndianAPI is the only reliable quote provider

## Historical/Bhavcopy Coverage

- DB: has historic data for current 31 scored symbols
- Yahoo: blocked from India
- jugaad-data: bhavcopy CSV works locally (needs Railway verification)
- nsepython: bhavcopy DataFrame works locally
- **Result**: DB provides for current universe; bhavcopy from jugaad-data/nsepython for new symbols

## Index/Sector Coverage

- nsepython: Nifty 50 index quote works
- jugaad-data: market_status (advances/declines) works, all_indices provides breadth
- **Result**: Index quote and market breadth available

## Automatic Fundamentals Result

- nsepython.nse_results(): ❌ Returns empty/no data
- nselib.financial_results_for_equity(): ❌ Requires Python 3.10+ (unavailable)
- Public NSE/BSE pages: Not machine-readable without scraping
- **Result**: Fundamentals NOT automatic
- **Status**: awaiting_operator_csv_export
- **Fallback**: CSV import (scripts/ingest-fundamentals.ts) for Screener/Moneycontrol exports

## CSV Fallback

- scripts/ingest-fundamentals.ts works with CSV import
- Supports yfinance as secondary provider
- Manual operator override available
- No fake fundamentals generated

## Backfill Result

- scripts/backfill-public-market-history.ts created
- Uses ProviderBroker to fetch historical data
- Dry-run by default (--apply required)
- Cannot run against Railway without deployed changes

## Scored-Symbol Coverage

- Before: 94/116 symbols on leaderboard, 31 fully scored
- After: Same — scoring unchanged (formulas preserved)
- Fundamentals missing reason documented per symbol

## Financial Snapshots Before/After

- Before: CSV/yfinance imports only
- After: Same — automatic public fundamentals still unavailable

## Remaining Blockers

1. Yahoo blocked from India — no fix without proxy/evasion
2. nselib requires Python 3.10+ — Railway runtime upgrade needed
3. nsepython equity quote blocked by NSE
4. Automatic fundamentals not available from any public source
5. jugaad-data stock_df broken on Python 3.9
6. Railway probes not yet executed (requires deployment)

## Confirmation

- ✅ No fake data added
- ✅ No broker credentials required
- ✅ No secrets printed or committed
- ✅ No formulas changed
- ✅ No Dhan/Upstox/Finnhub active
- ✅ All 31 symbols remain scored
- ✅ CSV/manual fundamentals fallback preserved
- ✅ Provider status honest by domain
- ✅ Public NSE providers documented with limitations
