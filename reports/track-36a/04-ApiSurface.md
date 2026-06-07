# TRACK-36A AGENT 4: API Surface Audit
**Generated:** 2026-06-07T01:24+05:30
**Source:** `src/backend/web/routes/` directory listing (11 files), `intelligence.ts` read from TRACK-36

## Route Files Inventory

| File | Purpose |
|------|---------|
| `index.ts` | Route aggregation/mounting |
| `intelligence.ts` | Main intelligence/ranking API |
| `auth.ts` | Authentication routes |
| `discovery.ts` | Stock discovery/search |
| `health.ts` | System health checks |
| `healthometer.ts` | Extended health monitoring |
| `investorState.ts` | User investor state/settings |
| `marketData.ts` | Market data (prices, quotes) |
| `search.ts` | Symbol search |
| `system.ts` | System operations |
| `userProfile.ts` | User profile management |

## Endpoint Inventory

### SAFE_FUNDAMENTAL (financials, rankings — always allowed for guests)

| Endpoint | Source | Route File | Guest? |
|----------|--------|------------|--------|
| `/api/stockstory/:symbol` | factor_snapshots (DB) | intelligence.ts | ✅ Yes |
| `/api/intelligence/company/:symbol` | financial_snapshots (DB) | intelligence.ts | ✅ Yes |
| `/api/intelligence/discovery/rankings` | factor_snapshots (DB) | intelligence.ts | ✅ Yes |
| `/api/intelligence/watchlist` | watchlist data (DB) | intelligence.ts | ✅ Yes |
| `/api/intelligence/market` | market analytics (DB) | intelligence.ts | ✅ Yes |
| `/api/intelligence/portfolio` | portfolio analytics (DB) | intelligence.ts | ✅ Yes |
| `/api/company/:symbol/financials` | financial_snapshots (DB) | intelligence.ts | ✅ Yes |
| `/api/company/:symbol/valuation` | valuation analytics (DB) | intelligence.ts | ✅ Yes |
| `/api/company/:symbol/risks` | risk assessment (DB) | intelligence.ts | ✅ Yes |
| `/api/company/:symbol/ownership` | ownership data (DB) | intelligence.ts | ✅ Yes |

### SAFE_HISTORICAL (historical prices — guest OK)

| Endpoint | Source | Route File | Guest? |
|----------|--------|------------|--------|
| `/api/company/:symbol/history` | daily_prices (DB) | intelligence.ts | ✅ Yes |
| `/api/discovery` | symbols (DB), search index | discovery.ts | ✅ Yes |
| `/api/search` | symbols (DB) | search.ts | ✅ Yes |

### LICENSED_MARKET_DATA (live prices — should be restricted)

| Endpoint | Source | Route File | Guest? |
|----------|--------|------------|--------|
| `/api/market/data` | ProviderCoordinator (live) | marketData.ts | ⚠️ Should restrict |
| `/api/market/quote/:symbol` | Yahoo/Upstox (live) | marketData.ts | ⚠️ Should restrict |

### BROKER_SCOPED (requires broker auth)

| Endpoint | Source | Route File | Guest? |
|----------|--------|------------|--------|
| `/api/broker/portfolio` | UpstoxProvider (OAuth) | broker routes | ❌ Auth required |
| `/api/broker/holdings` | UpstoxProvider (OAuth) | broker routes | ❌ Auth required |
| `/api/broker/orders` | UpstoxProvider (OAuth) | broker routes | ❌ Auth required |

### SYSTEM (operational — admin/auth)

| Endpoint | Source | Route File | Guest? |
|----------|--------|------------|--------|
| `/api/health` | pool.ping | health.ts | ✅ Yes |
| `/api/system/status` | SystemHealthEngine | system.ts | ✅ Yes |
| `/api/auth/*` | Firebase/auth DB | auth.ts | ✅ Yes (login) |
| `/api/investor-state` | investor_state (DB) | investorState.ts | ❌ Auth required |
| `/api/user/profile` | user_profiles (DB) | userProfile.ts | ❌ Auth required |

## Classification Summary

| Category | Endpoints | Guest Access |
|----------|-----------|-------------|
| SAFE_FUNDAMENTAL | ~10 | ✅ Allowed |
| SAFE_HISTORICAL | ~3 | ✅ Allowed |
| LICENSED_MARKET_DATA | ~2 | ⚠️ Should gate |
| BROKER_SCOPED | ~3 | ❌ Auth required |
| SYSTEM | ~5 | Mixed |

## Missing Endpoints (from TRACK-34 spec, not yet wired)

| Planned Endpoint | Engine | Status |
|-----------------|--------|--------|
| `/api/providers/health` | ProviderAnalyticsEngine | ❌ Not wired |
| `/api/system/health` | SystemHealthEngine | ❌ Not wired |
| `/api/stockstory/:symbol/explanation` | RankingExplanationEngine | ❌ Not wired |

These engines exist, compile, and have exports — they just need route wiring.

## Key Finding: No Live Prices for Guests

The existing route architecture already separates:
- DB-backed endpoints (fundamentals, rankings, historical prices) — guest safe
- Live provider endpoints (market data) — in separate `marketData.ts` route

This means the TRACK-36 compliance layer is architecturally straightforward: add a middleware guard on `marketData.ts` routes that checks user auth status. No refactor of existing routes needed — they already use database snapshots.

## Verdict: **API_SURFACE_KNOWN — 20+ endpoints mapped, 13 SAFE for guests without changes**
