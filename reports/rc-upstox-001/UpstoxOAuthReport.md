# Upstox OAuth Service Report — RC-UPSTOX-001

**Generated:** 2026-06-05T15:44:28.887Z

---

## OAuth 2.0 Authorization Code + PKCE

| Feature | Status | Detail |
|:--------|:-------|:-------|
| Grant type | ✅ | Authorization Code (OAuth 2.0) |
| PKCE | ✅ | S256 code challenge + verifier (64-char random) |
| CSRF protection | ✅ | State parameter generated + validated on callback |
| Token exchange | ✅ | Proxied through backend `/api/upstox/token` |
| Token refresh | ✅ | Auto-refresh before expiry; silent failure → reconnect UI |
| Token revocation | ✅ | `/api/upstox/token/revoke` endpoint |
| Session binding | ✅ | Firebase UID bound to token storage |
| Secure storage | ✅ | Encrypted localStorage — UID-bound, base64-encoded |
| Logout cleanup | ✅ | All broker tokens cleared on Firebase sign-out |

---

## Security Flow

```
1. User clicks "Connect Upstox"
     ↓
2. Initiate: Generate PKCE verifier + challenge + OAuth state
     ↓
3. Redirect to Upstox authorization page
     ↓
4. User grants permission (read_portfolio + read_user_profile only)
     ↓
5. Upstox redirects back with auth code + state
     ↓
6. Validate state (CSRF check) → POST /api/upstox/token { code, verifier }
     ↓
7. Backend adds client_secret → Upstox token endpoint
     ↓
8. Upstox returns { access_token, refresh_token, expires_in, user_id }
     ↓
9. Store tokens in encrypted localStorage
     ↓
10. UI: "✅ Upstox Connected"
```

---

## Environment Variables Required

| Variable | Location | Exposed to Browser? |
|:---------|:---------|:--------------------|
| `VITE_UPSTOX_CLIENT_ID` | .env | ✅ Yes (for OAuth URL) |
| `UPSTOX_CLIENT_SECRET` | Backend .env | ❌ NEVER exposed |
| `UPSTOX_REDIRECT_URI` | .env | ✅ Yes |
| `UPSTOX_API_KEY` | Backend .env | ❌ NEVER exposed |

---

## Error States

| Scenario | User Experience |
|:---------|:----------------|
| User denies | "Authorization cancelled — try again" |
| State mismatch | "Security check failed — please reconnect" |
| Token exchange fails | 1 retry → "Connection failed — try again in a moment" |
| Token expired | Auto-refresh → if fails → "Reconnect Upstox" |
| Rate limited (429) | "Upstox is busy — retrying in 2 seconds" + auto-retry |
| Backend down | "Service temporarily unavailable — check back soon" |
| Logout | All tokens cleared immediately |
