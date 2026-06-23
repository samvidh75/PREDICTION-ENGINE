# Part DX — Provider Reliability & Premium Frontend Continuation

## Baseline
**Commit:** 1485a30ec

## Provider Status

| Provider | Status | Notes |
|---|---|---|
| IndianAPI | healthy (144ms) | Primary quote source |
| Yahoo Finance | healthy (176ms) | Fallback/secondary |
| Jugaad-data | healthy (1376ms) | Historical data |
| NSEPython | healthy (2581ms) | Index/bhavcopy |
| Trendlyne | disabled-by-config | Needs TRENDLYNE_ENABLED=true in Railway env |
| StockEdge | disabled-by-config | Needs STOCKEDGE_SESSION_COOKIE in Railway env |
| Screener.in | not integrated | Would need new provider implementation |

## Provider Reliability Audit
- Created `scripts/audit-provider-reliability.ts` — checks: public-copy, market-data, search, scanner, news, health, Trendlyne/StockEdge config safety
- Added package scripts: `audit:provider-reliability`, `smoke:trendlyne`, `smoke:stockedge`

## Yahoo/Yahoo Finance
- Currently healthy as fallback (176ms latency)
- Provider ordering: IndianAPI → Jugaad → NSEPython → Yahoo
- All providers healthy — no blocked state to handle currently

## Trendlyne
- Config parser exists at `TrendlyneConfig.ts`
- Disabled by default (`TRENDLYNE_ENABLED` env var not set)
- To enable: set `TRENDLYNE_ENABLED=true`, `TRENDLYNE_WIDGET_MODE=iframe` in Railway env
- Public UI silently omits widget when disabled
- No "Trendlyne disabled" wording in public UI

## StockEdge
- Session wrapper exists
- Disabled by default (session cookie not configured)
- To enable: set `STOCKEDGE_SESSION_COOKIE` in Railway env
- Public UI does not expose StockEdge status

## Safe Scraping Guardrails
- No scraping code runs in production without explicit allowlist
- No CAPTCHA/MFA bypass
- No login automation
- No committed cookies/sessions
- All providers use official APIs or public RSS feeds
- Rate limiting where applicable
- Aggressive caching (2-30 min TTLs)

## Internal Diagnostics
- Provider health available via `scripts/check-market-data-providers.ts` (CLI only)
- Public `/healthz` and `/readyz` do not list provider names

## Required Railway Env Actions
- `TRENDLYNE_ENABLED=true` — enables Trendlyne widgets
- `TRENDLYNE_WIDGET_MODE=iframe` — widget rendering mode
- `STOCKEDGE_SESSION_COOKIE=<value>` — enables StockEdge enrichment

## Frontend Polish
- DesktopRail: premium graphite left rail, hover-expand
- IntelligenceOSShell: unified shell with mobile 5-tab nav
- Scanner: 5 real results from financial_snapshots scoring
- Stock page: prices consistent between snapshot and quote
- All trust gates preserved

## Verification
- Typecheck: PASS
- Build: PASS
- Tests: 1619 passed, 0 failed
- Public-copy audit: PASS

## Remaining Blockers
- Scanner returns 5 results (limited by data — correct behavior)
- Trendlyne/StockEdge need env config for full activation

## Confirmations
- No fake data
- No secrets/cookies/sessions committed
- No direct investment advice
- No backend/provider public wording
- No DNS changes
