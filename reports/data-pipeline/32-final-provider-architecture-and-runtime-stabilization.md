# Report: Final Provider Architecture and Runtime Stabilization

**Date**: 2026-06-18
**Baseline commit**: 2cde6d5a
**Author**: Production data-platform engineering

## Python Runtime

### Before

| Aspect | Value |
|--------|-------|
| Base image | `node:22-alpine` (floating) |
| Python version | 3.14.5 (Alpine 3.22+ default) |
| Install method | `pip --break-system-packages` (PEP 668 workaround) |
| nselib | In `requirements-nse.txt`, active in provider matrix |
| Probe script | Checked nselib as importable |

### After

| Aspect | Value |
|--------|-------|
| Base image | `node:22-alpine3.20` (pinned to Alpine 3.20) |
| Python version | 3.12.x (stable, widely tested) |
| Install method | `python3 -m venv /opt/venv` + `pip install` (no `--break-system-packages`) |
| PATH | `ENV PATH="/opt/venv/bin:$PATH"` |
| Probe script | Checks venv status, reports nselib as `archived_unusable` |

### Venv/Pip Strategy

Created `/opt/venv` Python virtual environment in Dockerfile. All Python packages install into the venv. This:
- Avoids PEP 668 system package protection errors
- Is portable to non-Alpine base images
- Allows `pip install` without `--break-system-packages`
- Reports `venvActive: true` in runtime check

## NSELib Final Decision

nselib has been thoroughly evaluated and is **not active** in production.

| Action | Detail |
|--------|--------|
| Removed from `requirements-nse.txt` | No longer installed in Docker build |
| Removed from `ProviderBroker` precedence | Not in quote/historical/bhavcopy/index chains |
| Removed from active health checks | `/api/ops/health` reports `archived_unusable` |
| Removed from active probes | `/api/ops/probe/nselib` returns archive status |
| Archived in docs | `docs/data/nselib-provider.md` clearly marked as archived |
| UI Trust Centre | Shows `NSELib (archived)` with purple `Archived` badge |
| Data-quality compliance | Checks NSELIB status is `archived_unusable` |
| Smoke test | Verifies NSELIB is `archived_unusable` |

References remain only in:
- Historical documentation (clearly labelled as archived)
- Archived probe script (`check-nselib-provider.ts` returns archive status)
- Reports

## Active Provider Matrix

| Domain | Primary | Fallback | Notes |
|--------|---------|----------|-------|
| Live quotes | IndianAPI | DB/Redis last-known | Cache-protected, SWR |
| Index quotes | NSEPython | Jugaad-Data | Railway domain-proven |
| Bhavcopy | Jugaad-Data | NSEPython | Both domain-proven |
| Historical OHLCV | DB history (31 sym) | Bhavcopy backfill | No IndianAPI overload |
| RBI/Macro | Jugaad-Data | — | Domain-proven |
| Fundamentals | CSV import | Manual filings | No automatic source |
| Infrastructure | Redis | In-memory | Cache hierarchy L1+L2 |

## IndianAPI Load Protection

Implemented via existing `CacheHierarchyEngine` + `ProviderRequestBroker`:

1. **Redis TTL cache**: 30s TTL for quotes, 10m for history, 1h for financials
2. **In-memory fallback**: When Redis unavailable, uses `Map<string, CacheEntry>`
3. **Request coalescing**: Single-flight for concurrent same-symbol requests
4. **Stale-while-revalidate**: Returns stale data, refreshes async
5. **Last-known fallback**: Returns cached quote with `freshnessStatus: 'stale'`
6. **Rate limiting**: Per-minute/day/burst quota enforcement via `ProviderQuotaPolicy`
7. **Usage counters**: Call ledger tracks provider usage for ops diagnostics

## Jugaad-Data Domain Results

| Domain | Status | Detail |
|--------|--------|--------|
| Package import | healthy | v0.28 importable |
| stock_df | python_version_incompatible (local) / healthy (Railway) | str.replace(day=1) bug on 3.9 |
| bhavcopy | healthy | Returns file paths with CSV data |
| market_status | healthy | NSELive.market_status() works |
| rbi_rates | healthy | RBI.current_rates() works |
| all_indices | healthy | NSELive.all_indices() works |

## NSEPython Domain Results

| Domain | Status | Detail |
|--------|--------|--------|
| Package import | healthy | nsepython v2.97+ importable |
| nifty_quote | healthy | Index quote returns lastPrice |
| equity_quote | endpoint_failed | NSE blocks equity quote endpoints |
| history | endpoint_failed | NSE blocks historical endpoints |
| bhavcopy | healthy | get_bhavcopy returns rows |
| financial_results | endpoint_failed | nse_results returns no data |

## Yahoo Result

| Aspect | Status |
|--------|--------|
| Railway | Blocked HTTP 429 |
| Local | Blocked HTTP 429 |
| Production role | Degraded, not load-bearing |
| Evasion | None — no proxy/CAPTCHA bypass |

## Fundamentals Result

No automatic public fundamentals source is currently reliable:
- NSEPython `nse_results()` returns no data
- NSELib archived — evaluated and not active
- Jugaad-Data does not provide fundamentals
- CSV import / manual filings is the only active path

## Scored-Symbol Coverage

All 31 symbols remain scored. No symbols added or removed.

## Tests

| Suite | Result |
|-------|--------|
| Typecheck | Pass |
| Lint | Pass |
| Unit (948) | 948/948 pass |
| E2E (36) | 36/36 pass |
| Hygiene | Pass (0 secrets) |
| Frontend build | Pass |
| Backend build | Pass |

## Production Verification

All applicable smoke and data-quality checks pass locally. Railway production verification will run after deployment.

## Remaining Blockers

- IndianAPI is the sole live quote provider; if it becomes unavailable, no fallback quote provider exists
- Yahoo remains blocked (HTTP 429) with no path to recovery
- Fundamentals have no automatic public source
- Jugaad-Data `stock_df` fails on Python 3.9 (local dev only)

## Compliance Confirmation

- **No fake data**: Verified across data quality, smoke, and compliance checks
- **No broker credentials**: Dhan/Upstox/Finnhub removed from active references
- **No secrets**: Hygiene scan passes, no secrets in committed files
- **No scoring formula changes**: All formulas unchanged
- **No prediction formula changes**: Unchanged
- **No ranking formula changes**: Unchanged
