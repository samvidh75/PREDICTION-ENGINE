# Open-Source Python SDK Research Report

Generated: 2026-06-18

## Summary

| SDK | Version | Quote | Historical | Bhavcopy | Index | Safe to Activate | Decision |
|---|---|---|---|---|---|---|---|
| jugaad-data | 0.28 | ❌ | ✅ | ❌ | ❌ | ⚠️ | probe_only |
| nsepython | 2.97 | probed | probed | probed | probed | ⚠️ | probe_only |
| akshare | 1.18.64 | ⏭️ | ❌ | ⏭️ | ⏭️ | ❌ | future_watch |
| nsepy | stale | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ❌ | archive |

## Decisions

| SDK | Decision | Rationale |
|---|---|---|
| **jugaad-data** | **probe_only** | Historical data works (22 rows for SBIN). Quote fails (NSE JSON decode). Bhavcopy fails (date not yet published). License is non-standard (YOLO). Already configured as optional fallback. Domain-level status only — not safe as primary. |
| **nsepython** | **probe_only** | Functions exist (equity_history, get_bhavcopy, index_history). Already configured as optional fallback for index_quote and bhavcopy. Standard GNU license. NSE website dependency. |
| **akshare** | **future_watch** | China-market focused (东方财富). No verified India-specific equity endpoints. Heavy dependency tree. Connection refused on China endpoints (rate limited). Not useful for Indian market data. |
| **nsepy** | **archive** | No longer maintained. Old NSE website scraping (likely blocked). Functionality migrated to nsepython. Package name conflict on PyPI. |

## Current Architecture Confirmed

- **IndianAPI**: ✅ Primary quote source (when configured)
- **jugaad-data**: ✅ Optional fallback for historical/bhavcopy/RBI
- **nsepython**: ✅ Optional fallback for index_quote/bhavcopy
- **Yahoo**: ❌ Blocked/not load-bearing
- **NSELib**: ❌ Archived
- **Fundamentals**: ⚠️ Partial — Screener.in viable, Moneycontrol financials blocked

## No New SDK Activation Needed

No evaluated SDK provides a net-new domain that isn't already covered by existing providers or that would be safe to activate as a primary source. The existing provider architecture is correct.
