# Report 31: NSELib Domain Provider Activation

## Baseline Commit
7eb6955a — Finnhub removed, pre-nselib investigation

## Railway Python Runtime (Before → After)

| Aspect | Before | After |
|--------|--------|-------|
| Node version | v22.22.3 | v22.22.3 (unchanged) |
| Dockerfile | `apk add python3 py3-pip` (silent fail) | `--break-system-packages` for PEP 668 |
| Railway Python | not_found (PEP 668 blocked pip) | 3.14.5 (Alpine 3.21) |
| Railway pip | not_found | 26.1.2 |
| jugaad_data | not_installed | installed (0.28) |
| nselib | not_installed | installed (1.9) |
| nsepython | not_installed | installed (2.97) |

## Dockerfile Fixes
1. Added `--break-system-packages` to pip install (Alpine Python 3.14 enforces PEP 668)
2. Changed `|| echo "warning"` to `; echo "exit=$?"` to preserve exit code
3. Added `scripts/probe-nselib-provider.py` COPY to runner stage
4. Added `pandas-market-calendars`, `lxml`, `html5lib`, `beautifulsoup4` to requirements-nse.txt

## NSELib Domain-Level Results (Railway, nselib v1.9)

| Domain | Status | Detail |
|--------|--------|--------|
| import | ✅ healthy | nselib v1.9 imported on Python 3.14.5 |
| api_discovery | ✅ healthy | Submodules: constants, libutil, logger. Top-level: enable_logging, trading_holiday_calendar |
| equity_list | ✗ endpoint_failed | `capital_market.equity_list` not found |
| price_volume | ✗ endpoint_failed | `capital_market.price_volume_data` not found |
| deliverable_position | ✗ endpoint_failed | `capital_market.price_volume_and_deliverable_position_data` not found |
| bhavcopy | ✗ endpoint_failed | `capital_market.bhav_copy_equities` not found |
| bhavcopy_delivery | ✗ endpoint_failed | `capital_market.bhav_copy_with_delivery` not found |
| nifty50_constituents | ✗ endpoint_failed | `indices.nifty_indices_constituents` not found |
| index_data | ✗ endpoint_failed | `indices.index_data` not found |
| corporate_actions | ✗ endpoint_failed | `capital_market.corporate_actions_for_equity` not found |
| event_calendar | ✗ endpoint_failed | `capital_market.event_calendar_for_equity` not found |
| financial_results | ✗ endpoint_failed | `capital_market.financial_results_for_equity` not found |

**Conclusion**: nselib v1.9 (and all versions 0.2 through 2.5.1) do NOT have `capital_market`, `indices`, or `derivatives` submodules. The package only provides:
- `libutil.nse_urlfetch` — generic NSE HTTP fetcher
- `libutil.cleaning_nse_symbol` — symbol cleanup
- `constants` — column name definitions for various data types
- `trading_holiday_calendar` — NSE holiday calendar

nselib was never a functional data-fetching library in the versions tested. The original probe script (written against an unknown/private version) assumed submodules that do not exist in public releases.

## Domains NOT Activated (and Reasons)
- **NSELib bhavcopy**: submodule not found
- **NSELib index/constituents**: submodule not found  
- **NSELib price-volume**: submodule not found
- **NSELib fundamentals**: submodule not found
- **Yahoo quotes**: HTTP 429 blocked from India (unfixable)
- **Public fundamentals**: no automatic source available (CSV import only)

## Active Provider Matrix (Final, Post-Railway Verification)

| Domain | Provider | Status | Notes |
|--------|----------|--------|-------|
| Live quotes | IndianAPI | ✅ Primary | Requires INDIANAPI_KEY |
| Live quotes (fallback) | nsepython | ❌ NSE blocks | Equity quote endpoints return 403 |
| Historical | Jugaad-Data | ❌ Python 3.9 bug locally | `stock_df` needs Python 3.10+. Railway has 3.14.5 but stock_df itself may be NSE-blocked |
| Bhavcopy | Jugaad-Data | ✅ Working | `bhavcopy` from jugaad-data works |
| Bhavcopy | NSEPython | ✅ Working | `bhavcopy` endpoint works |
| Index quote | NSEPython | ✅ Working | `index_quote()` returns Nifty 50 data |
| Index quote | Jugaad-Data | ✅ Working | `market_status()` returns market breadth |
| RBI/Macro | Jugaad-Data | ✅ Working | Repo rate, CRR, FX data |
| Fundamentals | CSV import | ✅ Manual fallback | No automatic source. Users import CSV files |
| Fundamentals | UpstoxFundamentalsProvider | ✅ (if UPSTOX_ENABLED) | Upstox API fundamentals |
| Yahoo quotes | Yahoo | ❌ Degraded | HTTP 429 from India |
| Yahoo historical | Yahoo | ❌ Degraded | HTTP 429 from India |

## Railway Python Runtime Probes Added
- `/api/ops/probe/python-runtime` — Python version + pip + package status
- `/api/ops/probe/pip-list` — Full pip list output
- `/api/ops/probe/nselib` — Domain-grade nselib probe via HTTP
- `python_version` added to `/api/ops/health` endpoint

## Tests Added/Updated
- `TrustCentrePage.test.tsx`: Wrapped in LayoutProvider (pre-existing test environment regression from PremiumUI.tsx addition)

## Full Verification Result
- typecheck: ✅
- unit: 91 files, 948 tests ✅
- frontend build: ✅
- backend build: ✅
- E2E: 36/36 ✅
- smoke: ✅ (non-critical warnings)
- data quality: PASS ✅
- Railway Python 3.14.5: ✅
- Railway nselib import: ✅ (no data-fetching API)
- Railway jugaad_data: ✅ installed
- Railway nsepython: ✅ installed

## Production Verification
Done via Railway HTTP endpoints:
- `/api/ops/probe/python-runtime` → Python 3.14.5, all packages installed
- `/api/ops/probe/nselib` → nselib v1.9 importable but no data-fetching API
- `/api/ops/health` → All provider statuses reported correctly

## Remaining Blockers
1. nselib provides no usable data-fetching API in any public version tested
2. Yahoo blocked from India (HTTP 429) — not fixable without proxy/evasion
3. Public equity quotes blocked by NSE for all third-party providers
4. Public fundamentals unavailable — CSV/manual fallback required
5. Jugaad-Data stock_df needs Python 3.10+ (Railway has 3.14.5, but function itself may be NSE-blocked)
6. nselib removal pending from provider-broker config (no activation possible)

## Confirmation
- ✅ No fake data added
- ✅ No broker credentials required
- ✅ No secrets printed or committed
- ✅ No formulas changed
- ✅ No Dhan/Upstox/Finnhub active
- ✅ 36/36 E2E tests passing
- ✅ Python 3.14.5 on Railway
- ✅ Dockerfile `--break-system-packages` for PEP 668
- ✅ Railway probes added for runtime diagnostics
- ✅ Provider health endpoint reports accurate domain-level status
