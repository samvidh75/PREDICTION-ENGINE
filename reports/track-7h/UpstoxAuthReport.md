# Upstox OAuth Implementation Report — TRACK-7H

**Generated:** 2026-06-05T15:21:29.479Z

---

## Implementation Summary

| Component | File | Status |
|:----------|:-----|:-------|
| OAuth 2.0 Authorization Code flow | `UpstoxOAuth.ts` | ✅ Implemented |
| PKCE (code challenge) | `UpstoxOAuth.ts` | ✅ Generate code verifier + challenge |
| CSRF protection | `UpstoxOAuth.ts` | ✅ State parameter validation |
| Token exchange proxy | `UpstoxOAuth.ts` | ✅ Backend proxy /api/upstox/token |
| Token refresh | `UpstoxOAuth.ts` | ✅ Automatic refresh before expiry |
| Secure token storage | `TokenStore.ts` | ✅ UID-bound, base64-encoded localStorage |
| Token expiry management | `TokenStore.ts` | ✅ isExpired() + isNearExpiry() checks |
| Broker disconnect | `TokenStore.ts` | ✅ Revoke + remove tokens |
| Multi-broker support | `TokenStore.ts` | ✅ Separate token per broker per UID |
| Logout cleanup | `TokenStore.ts` | ✅ clearAll() on Firebase sign-out |

---

## OAuth Flow Diagram

```
1. User: Clicks "Connect Upstox"
     ↓
2. UpstoxOAuth.buildAuthUrl() → Upstox authorize page
     ↓
3. User: Grants permission ("read_portfolio" only)
     ↓
4. Upstox: Redirects to /broker/upstox/callback?code=xxx&state=yyy
     ↓
5. StockStory: Validates state (CSRF check)
     ↓
6. StockStory: POST /api/upstox/token { code, redirect_uri, code_verifier, uid }
     ↓
7. Backend: Adds client_secret, forwards to Upstox token endpoint
     ↓
8. Upstox: Returns { access_token, refresh_token, expires_in, user_id }
     ↓
9. TokenStore.save({ accessToken, refreshToken, expiresAt, uid, broker: 'upstox' })
     ↓
10. UI: Shows "✅ Upstox Connected"
```

---

## Security Architecture

| Concern | Solution | Why |
|:--------|:---------|:----|
| Client secret exposure | Proxy through /api/upstox/token backend | Client secret never reaches browser |
| Token theft | UID-bound + base64 encoding | Tokens are per-user; cleared on logout |
| CSRF | OAuth state parameter | Prevents authorization code interception |
| Token expiry | expiresAt tracking + auto-refresh | Prevents 401 errors mid-session |
| Scope | read_portfolio + read_user_profile only | No write access possible |
| Session binding | TokenStore.clearAll(uid) on logout | Broker tokens die with Firebase session |

---

## Required Environment Variables

| Variable | Purpose | Where |
|:---------|:--------|:------|
| `UPSTOX_CLIENT_ID` | Upstox API client ID | .env (exposed to frontend) |
| `UPSTOX_CLIENT_SECRET` | Upstox API client secret | .env (backend only) |
| `UPSTOX_REDIRECT_URI` | OAuth callback URL | .env |
| `UPSTOX_API_KEY` | Upstox API key (v2) | .env (backend only) |

---

## Error States Handled

| Error | Handling |
|:------|:---------|
| User denies authorization | Upstox redirects with error=access_denied → UI shows "Authorization cancelled" |
| Invalid state parameter | UI shows "Security check failed — please try again" |
| Token exchange fails | Retry once → UI shows "Connection failed — please try again" |
| Token expired | Auto-refresh using refreshToken → if fails, prompt re-auth |
| Refresh token revoked | TokenStore.remove() → UI shows "Reconnect Upstox" |
| Network timeout | Exponential backoff (1s, 2s, 4s) → UI shows "Network error" |
| Backend proxy unavailable | UI shows "Service temporarily unavailable" |

---

## Logging & Monitoring

| Event | Log Level | Details |
|:------|:----------|:--------|
| OAuth initiated | INFO | broker, uid (no tokens) |
| Token exchange success | INFO | broker, uid, expiresAt |
| Token exchange failure | ERROR | broker, uid, HTTP status |
| Token refresh | INFO | broker, uid |
| Token refresh failure | WARN | broker, uid → triggers reconnect UI |
| Broker disconnected | INFO | broker, uid |

**No tokens or secrets are ever logged.** Only broker name, UID, and expiry timestamps.

---

## Test Checklist

- [ ] OAuth redirect URL works
- [ ] State parameter validated on callback
- [ ] Token exchange via proxy
- [ ] Token stored securely in localStorage
- [ ] Token refresh works before expiry
- [ ] Expired token triggers refresh
- [ ] Revoked refresh token prompts re-auth
- [ ] Logout clears all broker tokens
- [ ] Multiple broker tokens per user work
- [ ] No client secret in browser network tab

