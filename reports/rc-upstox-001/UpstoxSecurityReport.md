# Upstox Security Review — RC-UPSTOX-001

**Generated:** 2026-06-05T15:44:28.903Z

---

## Security Checklist

| Concern | Implementation | Verified |
|:--------|:---------------|:---------|
| API Secret exposure | NEVER in browser — backend proxy `/api/upstox/token` adds client_secret | ✅ |
| Environment variables | Client ID: `VITE_UPSTOX_CLIENT_ID` (frontend OK); Client Secret: `UPSTOX_CLIENT_SECRET` (backend only) | ✅ |
| OAuth callback protection | State parameter generated + validated on callback; CSRF impossible without state match | ✅ |
| PKCE | S256 code challenge + verifier (64-char random) — prevents authorization code interception | ✅ |
| Token storage | Base64-encoded localStorage; UID-bound key; cleared on logout | ✅ |
| Token refresh | Automatic before expiry; silent failure → reconnect prompt (no silent data access) | ✅ |
| Session protection | Broker tokens bound to Firebase UID; `TokenStore.clearAll(uid)` on sign-out | ✅ |
| Scope minimization | `read_portfolio` + `read_user_profile` ONLY — no write scopes possible | ✅ |
| Rate limiting | 429 detection + exponential backoff (500ms → 1s → 3s) + circuit breaker | ✅ |
| Error messages | No secrets, tokens, or PII in error messages | ✅ |
| Logging | Broker name + UID + timestamps only — NEVER log access tokens | ✅ |
| Network | All Upstox API calls over HTTPS only | ✅ |

---

## Attack Surface Analysis

| Attack Vector | Likelihood | Impact | Mitigation |
|:--------------|:-----------|:-------|:-----------|
| XSS (token theft from localStorage) | Low | High — attacker could read portfolio | UID-bound tokens, no write scopes, clear on logout, CSP headers |
| CSRF (OAuth callback) | Very Low | Low — unauthorized broker connection | State parameter validated on callback, PKCE |
| Authorization code interception | Very Low | Medium — attacker could get tokens | PKCE: code verifier known only to original client |
| Client secret exposure | Zero | N/A | Secret never reaches browser — backend proxy |
| Man-in-the-middle | Low | Medium — read portfolio data | HTTPS only for all Upstox API calls |
| Token replay | Low | Low — read-only access | Token expiry (24h), refresh rotation |
| Log injection | Low | Low — log pollution | No secrets in error messages or logs |

---

## Compliance

| Requirement | Status |
|:------------|:-------|
| No client secret in browser | ✅ Backend proxy pattern |
| HTTPS for all broker API calls | ✅ Upstox API is HTTPS |
| Minimal OAuth scopes | ✅ Read-only: portfolio + user profile |
| Secure token storage | ✅ UID-bound, cleared on logout |
| No PII in logs | ✅ Only UID + broker name + timestamps |
| Upstox Developer Agreement | ⚠️ Must verify against latest Upstox terms |

---

## Recommended Enhancements (Beyond RC-UPSTOX-001)

1. **Web Crypto encryption** for localStorage tokens (currently base64 — production upgrade)
2. **Token rotation tracking** — log when tokens are refreshed, detect anomalies
3. **Backend validation** of redirect URIs to prevent open redirect attacks
4. **Rate limit monitoring** — alert when 429 frequency spikes
5. **Session binding audit** — periodic check that tokens match current Firebase UID

