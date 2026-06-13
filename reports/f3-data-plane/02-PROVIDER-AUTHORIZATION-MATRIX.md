# F3 — PROVIDER AUTHORIZATION MATRIX

> Generated: 2026-06-13
> Branch: `track-f3-data-plane-quota-governance`

## Authorization Matrix

| Provider | Auth Method | Env Variable | Kill-switch | Docs / Authorization Record |
|----------|-------------|-------------|-------------|----------------------------|
| YahooProvider | None (public v8 chart API) | — | Not needed for v8 | Yahoo Finance terms of service — v8 is publicly accessible. v10 quoteSummary blocked (401). |
| FinnhubProvider | API key in query param | `FINNHUB_KEY`, `FINNHUB_API_KEY`, `VITE_FINNHUB_API_KEY` | Key absent → skip | Finnhub.io API terms. Key sent as `&token=` query param. |
| IndianMarketProvider | API key in `X-Api-Key` header | `INDIANAPI_KEY` | Key absent → warn (still tries) | IndianAPI.in service. Header-based auth. |
| UpstoxFundamentalsProvider | OAuth 2.0 Bearer token | `UPSTOX_ACCESS_TOKEN`, `VITE_UPSTOX_ACCESS_TOKEN` | No token → error | Upstox OAuth session. Token from localStorage or env. |
| ScreenerProvider | **NONE — HTML SCRAPER** | — | **Must be quarantined** | No API, no license, no authorization. **BLOCKER.** |
| GoogleNewsRssProvider | None (public RSS) | — | — | Public RSS feed. |
| UpstoxProvider (broker) | OAuth 2.0 | Upstox OAuth flow | — | Upstox broker API. |

## Key Issues

1. **ScreenerProvider** has no authorization whatsoever — it's an undocumented HTML scraper. This must be quarantined per Phase 0 blocker.
2. **IndianMarketProvider** warns on missing key but still attempts requests — should block before fetch when key is absent.
3. **FinnhubProvider** passes API key as URL query parameter (`&token=`). This leaks the key in logs, referrers, and persisted URLs.
4. **YahooProvider** has no auth for v8 chart API, but v10 quoteSummary (which would need cookies/session) is already blocked (401).
