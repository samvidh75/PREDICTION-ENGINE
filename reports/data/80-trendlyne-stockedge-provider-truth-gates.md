# Part CX — Trendlyne, Upstox, and provider truth gates

## Baseline
- User-reported baseline: `4f9fe45bf` — Upstox Developer API integration.
- Observed GitHub commit status for `4f9fe45bf`: Vercel success, Railway failure in combined status. This must be rechecked after the latest commits.

## Trendlyne result
- Hardened `TrendlyneConfig`.
- Default widget mode is disabled unless explicitly configured.
- Invalid widget mode/base URL degrades safely.
- Config summary hides API keys.
- Hardened `TrendlyneAdapter` with explicit status codes:
  - `TRENDLYNE_READY`
  - `TRENDLYNE_DISABLED`
  - `TRENDLYNE_EMBED_NOT_ALLOWED`
  - `TRENDLYNE_INVALID_CONFIG`
  - `TRENDLYNE_WIDGET_URL_INVALID`
  - `TRENDLYNE_API_KEY_MISSING`
  - `TRENDLYNE_OFFICIAL_ACCESS_REQUIRED`
- Added safe backend routes:
  - `GET /api/integrations/trendlyne/status`
  - `GET /api/integrations/trendlyne/widget/:kind/:symbol`
- Registered Trendlyne routes in backend route index.
- Updated `trendlyne:smoke` to validate widget URL generation and safe disabled states.
- Stock detail page now requests the safe Trendlyne widget route and only renders the lazy Trendlyne widget when the backend reports it available.
- Public UI omits Trendlyne completely when disabled.
- Added `docs/integrations/trendlyne.md`.

## Upstox status
- Upstox Developer API code exists with OAuth, sandbox client, market client, and safe status routes from Part CY.
- The connector cannot verify live Upstox sandbox or developer tokens because Railway environment tokens are not visible here and no token should be pasted into chat.
- Required Railway checks:
  - `railway run npm run upstox:config`
  - `railway run npm run upstox:auth-url`
  - `railway run npm run upstox:status`
  - `railway run npm run upstox:sandbox-smoke` when sandbox token is configured
  - `railway run npm run upstox:market-smoke` when live token is configured

## Trendlyne activation steps
Set in Railway:

```env
TRENDLYNE_ENABLED=true
TRENDLYNE_BASE_URL=https://trendlyne.com
TRENDLYNE_WIDGET_MODE=iframe
TRENDLYNE_EMBED_ALLOWED=true
TRENDLYNE_CACHE_TTL_SECONDS=43200
```

Then run:

```bash
railway run npm run trendlyne:config
railway run npm run trendlyne:smoke
```

## Remaining blockers
- Trendlyne cannot be proven live until Railway env is set and smoke is run.
- Upstox sandbox cannot be proven live until `UPSTOX_SANDBOX_ACCESS_TOKEN` is set directly in Railway.
- Upstox live market cannot be proven live until OAuth token exists in runtime.
- No secrets, cookies, or raw provider payloads are present in this report.

## Confirmations
- No fake Trendlyne data added.
- No fake Upstox execution added.
- No secrets committed.
- No cookies committed.
- No raw provider payloads committed.
- No DNS changes.
