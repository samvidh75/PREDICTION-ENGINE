# Provider Removal Report
## TRACK-8E Phase 1 — Removal of Dead Providers

**Generated**: 2026-06-06

---

## Removed Files

| File | Reason | Status |
|------|--------|--------|
| `src/services/providers/AlphaVantageProvider.ts` | Empty NSE returns, 0/19 fields. Free tier 25 req/day, NSE support limited. | ✅ DELETED |
| `src/services/providers/IndianAPIProvider.ts` | Wrong base URL + endpoint path since inception. Unreachable in live tests. See TRACK-8D audit. | ✅ DELETED |
| `src/services/providers/UpstoxProvider.ts` (duplicate) | Duplicate of `src/services/brokers/UpstoxProvider.ts`. Wrong location. | ✅ DELETED |

## Providers That Never Existed (Confirmed Clean)

| Provider | Status |
|----------|--------|
| DhanProvider | Never existed — no files found |
| TwelveDataProvider | Never existed — no files found |
| FMPProvider | Never existed — no files found |

## Import/Registration Cleanup

- `ProviderCoordinator.ts`: Removed `IndianAPIProvider` import and instantiation
- `ProviderCoordinator.ts`: Fixed `UpstoxProvider` import path (`../brokers/UpstoxProvider`)
- All dead provider imports verified removed

## Env Variable Cleanup

Remaining in `.env` (kept for potential future use):
- `FINNHUB_KEY` — currently returns 403 but kept for future reactivation
- `ALPHA_VANTAGE_KEY` — kept for potential future quote usage
- `INDIANAPI_KEY` — kept for potential future reactivation if API becomes reachable

These env vars are harmless and don't impact the running system since the providers that use them are no longer wired.
