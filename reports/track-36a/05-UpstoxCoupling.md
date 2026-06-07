# TRACK-36A AGENT 5: Upstox Coupling Audit
**Generated:** 2026-06-07T01:23+05:30
**Source:** Filesystem inventory of all Upstox-named files, ProviderCoordinator imports

## Upstox Files in Codebase

| File | Directory | Role |
|------|-----------|------|
| `UpstoxProvider.ts` | `src/services/brokers/` | Broker data adapter (OAuth-secured) |
| `UpstoxOAuth.ts` | `src/services/brokers/` | OAuth token management |
| `UpstoxFundamentalsProvider.ts` | `src/services/providers/` | Fundamentals provider |
| `UpstoxOAuthService.ts` | `src/services/providers/auth/` | Auth service abstraction |
| `UpstoxHealthEngine.ts` | `src/providers/upstox/` | Health check/ping |

Total: 5 files

## Classification of Every Upstox Reference

### MANDATORY References (code would fail without)
- **ProviderCoordinator.ts** — `UpstoxFundamentalsProvider` is the PRIMARY fundamentals source. If it fails, the financial merge falls through to Screener → Finnhub → Yahoo. Code continues but fundamentals may be degraded.

### OPTIONAL References (wrapped in conditional/try-catch)
- **ProviderCoordinator.ts** — `UpstoxProvider` for broker-scoped data. Gated by `process.env.UPSTOX_ACCESS_TOKEN`. If token missing, broker features are skipped.
- **UpstoxOAuth.ts** — Conditional: OAuth flow only triggered when user initiates broker connection.

### DANGEROUS References (could crash under conditions)
- None found — all Upstox paths have fallback chains in ProviderCoordinator.

### DEAD References
- None found — all 5 files are actively imported.

## Dual-Role Architecture (Critical Finding)

```
┌──────────────────────────────────────────────┐
│             UpstoxProvider.ts                │
│  (src/services/brokers/)                     │
│                                              │
│  Role 1: Broker Data                          │
│  └─ Portfolio, holdings, orders              │
│  └─ Requires OAuth user token                │
│  └─ User-scoped, per-session                 │
│                                              │
│  Role 2: Provider Data (via ProviderCoordinator)│
│  └─ Market data, prices                      │
│  └─ Uses app-level access token              │
│  └─ Global, shared                           │
└──────────────────────────────────────────────┘
```

UpstoxProvider serves BOTH the provider chain (Role 2) and the broker chain (Role 1). This creates a dual-role trap: any change to provider isolation affects broker functionality.

## Dependency Impact Analysis

**If Upstox fails (no token):**
- Fundamentals: Degraded (Screener becomes primary, Finnhub fallback)
- Prices: Degraded (Yahoo primary, Finnhub fallback)
- Broker features: Disabled (no portfolio, holdings, order data)
- Rankings: **UNAFFECTED** (rankings use factor_snapshots, not live providers)

**If Upstox fails (token expired/revoked):**
- Same as above, plus auth errors logged to ProviderHealthMonitor
- Circuit breaker opens for 60s, then retries

**If Upstox is removed entirely:**
- Fundamentals: Screener becomes primary (works fine)
- Broker features: Gone (no alternative broker integration)
- ProviderCoordinator: 4 providers in chain instead of 5

## Verdict: **UPSTOX_OPTIONAL**

Upstox is NOT a hard dependency. The platform degrades gracefully without it:
- Fundamentals continue via Screener/Finnhub/Yahoo
- Prices continue via Yahoo/Finnhub  
- Rankings are unaffected (use snapshots)
- Only broker-specific features (portfolio sync, holdings, orders) are lost

The dual-role architecture is a design concern but not an operational blocker.
