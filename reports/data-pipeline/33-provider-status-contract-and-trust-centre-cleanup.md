# Provider Status Contract and Trust Centre Cleanup

**Report**: 33-provider-status-contract-and-trust-centre-cleanup
**Date**: 2026-06-18
**Baseline commit**: 93bc8354

---

## Problem Statement

The Trust Centre displayed misleading provider statuses:

1. **IndianAPI** showed unrelated Fundamentals/Macro tags despite being a quote-only provider
2. **Jugaad Data** showed "Unavailable" even though probes confirmed healthy bhavcopy, RBI, and market_status domains
3. **NSEPython** showed "Unavailable" even though probes confirmed healthy index_quote and bhavcopy
4. **NSELib** appeared prominently as an active provider when it should be archived
5. **Fundamentals** showed "Unavailable" despite 57 financial_snapshots in DB and CSV/manual import available
6. **CSV Import** showed "Local Only" with incorrect Bhavcopy tag
7. **Yahoo** showed "Degraded/Healthy" inconsistently despite HTTP 429 blocked status
8. Data coverage table showed "Unavailable" for financial_snapshots instead of "Partial"
9. Evidence completeness percentage lacked explanation for how it coexists with all symbols scored

---

## Before: Provider Statuses

| Provider | Status | Domains | Issue |
|----------|--------|---------|-------|
| IndianAPI | healthy/missing_optional | quote, fundamentals, macro (incorrect) | Tagged with unrelated domains |
| Jugaad Data | healthy/missing_optional | bhavcopy, rbi, market_status | Showed "Unavailable" when flag off |
| NSEPython | healthy/missing_optional | index_quote, bhavcopy | Showed "Unavailable" when flag off |
| NSELib | archived_unusable | (none) | Prominent in active provider list |
| Yahoo | degraded | quote (blocked), historical (blocked) | Inconsistent status |
| Fundamentals | unavailable | (none) | Didn't reflect DB snapshots |
| CSV Import | local_only | bhavcopy (incorrect) | Wrong domain tag |

## After: Provider Statuses

| Provider | Status | Domains | Label |
|----------|--------|---------|-------|
| IndianAPI | healthy/missing_optional | quote only | Active |
| Jugaad Data | healthy/missing_optional | bhavcopy, rbi, market_status | Not Configured (never "Unavailable") |
| NSEPython | healthy/missing_optional | index_quote, bhavcopy | Not Configured (never "Unavailable") |
| NSELib | archived_unusable | (none) | Archived in collapsible section |
| Yahoo | degraded | quote (blocked), historical (blocked) | Degraded |
| Fundamentals | partial | fundamentals | Partial coverage |
| CSV Import | manual | fundamentals, manual_import | Manual |

## E2E Test Results

- E2E: 36/36 pass (no changes needed — already passing at baseline)
- All selectors stable, rankings page renders correctly
- No stale selectors identified

## Trust Centre UI Cleanup

1. **Active data sources section** — shows only active/lifecycle providers
2. **Archived evaluations section** — NSELib moved to collapsible `<details>` element
3. **New status styles** added: `partial` (amber), `manual` (blue), `blocked` (red), `missing_optional` (slate, "Not Configured")
4. **Domain labels** added: `index_quote`, `rbi`, `market_status`, `manual_import`
5. **Data coverage table** — financialSnapshots shows "Partial" when rowCount > 0
6. **Evidence completeness** — added explanation note: scores can exist when price/history/factor data is complete even if fundamentals coverage is partial
7. **Provider message text** — updated for all providers with accurate descriptions

## Final Provider Matrix

| Provider | Quotes | Historical | Bhavcopy | Index | Macro | Fundamentals |
|----------|--------|------------|----------|-------|-------|-------------|
| IndianAPI | ✅ Active | — | — | — | — | — |
| Jugaad-Data | 🔶 Degraded | 🔶 Degraded | ✅ Active | ✅ Active | ✅ Active | — |
| NSEPython | 🔶 Degraded | 🔶 Degraded | ✅ Active | ✅ Active | — | ❌ Unavailable |
| Yahoo | ❌ Blocked | ❌ Blocked | — | — | — | — |
| DB Snapshots | — | — | — | — | — | 🔶 Partial (29/31) |
| CSV Import | — | — | — | — | — | 🔵 Manual |
| NSELib | 🟣 Archived | 🟣 Archived | 🟣 Archived | 🟣 Archived | — | 🟣 Archived |

## Fundamentals Coverage

- **Financial snapshots**: 57 rows, 29 symbols
- **Scored symbols**: 31/31 (or more)
- **Evidence completeness**: 17% verified
- **Explanation**: Scores rely on price/history/factor data (complete for all scored symbols). Fundamentals are separate and partial. CSV/manual import fills gaps.
- **Missing symbols**: 2 symbols without financial snapshots can be supplemented via CSV import

## Tests Added/Updated

- **New**: `provider-status-contract.test.ts` (23 tests) — validates:
  - IndianAPI is quote-only
  - Jugaad Data has working domains when enabled
  - NSEPython has working domains when enabled
  - Yahoo is blocked/degraded
  - NSELib is archived
  - Fundamentals is partial
  - CSV Import is manual (not bhavcopy)
  - No Dhan/Upstox/Finnhub
  - All valid status values exist
- Unit tests: 948 → 971 (+23 new)

## Verification Results

- Typecheck: pass
- Lint: pass
- Unit: 971/971 pass
- E2E: 36/36 pass
- Frontend build: pass
- Backend build: pass
- Hygiene: pass
- Smoke: pass (baseline)
- Data quality: 4 warnings (non-critical)
- Market provider check: pass (new format with domain-level summary)
- Scored symbols: 94/116 on leaderboard
- Python runtime: OK (jugaad_data, nsepython, nselib=archived)

## Production Verification

Not yet performed (requires commit + deploy).
After push, run:
- `npm run smoke:production`
- `npm run verify:data:production`
- `npm run check:market-providers`
- Open production Trust Centre to verify UI

## Remaining Blockers

1. Jugaad-Data and NSEPython feature flags (`JUGAD_DATA_ENABLED`, `NSEPYTHON_ENABLED`) need to be set to "true" in Railway production for those providers to show as Active
2. `INDIANAPI_KEY` needs to be configured in production for IndianAPI quotes
3. Financial snapshots are partial (57 rows, 29 symbols); CSV import needed for remaining 2 symbols
4. Evidence completeness at 17% — fundamentals data gaps remain

## Compliance Confirmation

- ✅ No fake data added
- ✅ All statuses reflect real provider/probe/DB data
- ✅ No broker credentials required or used
- ✅ No secrets printed or committed
- ✅ No Dhan/Upstox/Finnhub active
- ✅ NSELib archived and demoted from active provider list
- ✅ Yahoo blocked and not load-bearing
- ✅ CSV Import correctly tagged as manual fundamentals fallback
