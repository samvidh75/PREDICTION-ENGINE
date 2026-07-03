# Open-Source Python SDK Research Report
Generated: 2026-07-03T19:38:28.780Z

## Summary Table
| SDK | Version | Python | Quote | Historical | Bhavcopy | Index | Safe to Activate | Warnings |
|---|---|---|---|---|---|---|---|---|
| jugaad-data | 0.28 | 3.14.6 | failed | healthy | healthy | failed | ✅ | Uses public NSE/RBI endpoints; unavailable domains must remain labelled. |
| nsepython | 0.1 | 3.14.6 | — | failed | healthy | failed | ✅ | Uses public NSE endpoints; unavailable domains must remain labelled. |
| nsetools | unknown | 3.14.6 | failed | — | — | — | ⚠️ | Legacy library built on unofficial NSE scraping.; Keep probe-only unless quote domain returns healthy consistently. |
| nselib | unknown | 3.14.6 | — | — | endpoint_failed | — | ⚠️ | — |
| akshare | not_installed | — | — | — | — | — | ❌ | No module named 'akshare' |
| nsepy | not_installed | — | — | — | — | — | ❌ | No module named 'nsepy' |

## Domain Detail
### jugaad-data v0.28
- Python: 3.14.6
- Safe to activate: true

**quote**: failed
  - Failure: JSONDecodeError
**historical**: healthy
  - Rows: 22
  - Sample fields: DATE, SERIES, OPEN, HIGH, LOW, PREV_CLOSE
**bhavcopy**: healthy
  - Rows: 3447
  - Sample fields: TRADDT, BIZDT, SGMT, SRC, FININSTRMTP, FININSTRMID
**index**: failed
  - Failure: JSONDecodeError
**rbi**: unavailable
**Warnings:**
- Uses public NSE/RBI endpoints; unavailable domains must remain labelled.

### nsepython v0.1
- Python: 3.14.6
- Safe to activate: true

**index_quote**: healthy
  - Rows: 13
**bhavcopy**: healthy
  - Rows: 3269
**index**: failed
  - Failure: JSONDecodeError
**historical**: failed
  - Failure: KeyError
**Warnings:**
- Uses public NSE endpoints; unavailable domains must remain labelled.

### nsetools vunknown
- Python: 3.14.6
- Safe to activate: false

**symbol_universe**: healthy
  - Rows: 2381
  - Sample fields: 20MICRONS, 21STCENMGM, 360ONE, 3BBLACKBIO, 3IINFOLTD, 3MINDIA
**quote**: failed
  - Failure: JSONDecodeError
**market_breadth**: healthy
  - Rows: 2
**Warnings:**
- Legacy library built on unofficial NSE scraping.
- Keep probe-only unless quote domain returns healthy consistently.

### nselib vunknown
- Python: 3.14.6
- Safe to activate: false

**import**: healthy
**api_discovery**: healthy
**equity_list**: endpoint_failed
**price_volume**: endpoint_failed
**deliverable_position**: endpoint_failed
**bhavcopy**: endpoint_failed
**bhavcopy_delivery**: endpoint_failed
**nifty50_constituents**: endpoint_failed
**index_data**: endpoint_failed
**corporate_actions**: endpoint_failed
**event_calendar**: endpoint_failed
**financial_results**: endpoint_failed

## Decisions
| SDK | Decision | Rationale |
|---|---|---|
| jugaad-data | activate | At least one critical domain is healthy and the package is safe to activate |
| nsepython | activate | At least one critical domain is healthy and the package is safe to activate |
| nsetools | archive | Legacy NSE scraper; symbol universe works but quote path is broken |
| nselib | archive | Package imports, but no usable market-data domains were discovered |
| akshare | reject | Not installed — No module named 'akshare' |
| nsepy | reject | Not installed — No module named 'nsepy' |