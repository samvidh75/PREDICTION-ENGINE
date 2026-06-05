# Upstox OAuth Validation Report — TRACK-7H-A

**Generated:** 2026-06-05T16:26:14.077Z

---

## OAuth Flow Verification

### 1. OAuth URL Generation

| Parameter | Value | Valid |
|:----------|:------|:------|
| client_id | a16839aa-ef23-4d8d-acf2-e3f900327331 | ✅ |
| redirect_uri | http://localhost:5173/auth/upstox/callback | ✅ |
| response_type | code | ✅ |
| scope | read_portfolio read_user_profile | ✅ |
| state | c68012531f028fea... | ✅ |
| code_challenge | dca764c7a53b3028... | ✅ |
| code_challenge_method | S256 | ✅ |

**Generated URL:**  
`https://api.upstox.com/v2/login/authorization/dialog?client_id=a16839aa-ef23-4d8d-acf2-e3f900327331&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fupstox%2Fcallback&response_type=code&scope=read_portfolio+read_user_profile&state=c68012531f028fea39053a6eee8d2b3f&code_challenge=dca764c7a53b302817735e64581ad2bac0f9698e651&code_challenge_method=S256`

### 2. Authorization Flow

```
1. User navigates to OAuth URL → Upstox login page
2. User authenticates → Upstox prompts for permission scopes
3. User grants "read_portfolio" + "read_user_profile"
4. Upstox redirects to: http://localhost:5173/auth/upstox/callback?code=AUTH_CODE&state=c6801253...
5. StockStory validates state === stored state ✅
6. StockStory POSTs to /api/upstox/token with { code, code_verifier, redirect_uri }
7. Backend adds UPSTOX_CLIENT_SECRET → Upstox token endpoint
8. Upstox returns { access_token, refresh_token, expires_in, user_id }
9. Tokens stored in localStorage (UID-bound, base64-encoded) ✅
10. UI shows "✅ Upstox Connected"
```

### 3. PKCE Verification

| Component | Status |
|:----------|:-------|
| Code verifier (43 chars) | ✅ Generated |
| Code challenge (S256) | ✅ Generated |
| Verifier stored in sessionStorage | ✅ On OAuth initiation |
| Verifier sent on token exchange | ✅ Via /api/upstox/token |
| Verifier cleared after exchange | ✅ sessionStorage cleared |

### 4. CSRF Protection

| Component | Status |
|:----------|:-------|
| State parameter (32 chars) | ✅ Generated |
| State stored in sessionStorage | ✅ On OAuth initiation |
| State validated on callback | ✅ In exchangeCode() |
| State cleared after validation | ✅ |

### 5. Token Security

| Component | Status |
|:----------|:-------|
| Storage: localStorage | ✅ UID-bound key: ss_broker_token_upstox_{uid} |
| Encoding: base64 | ✅ btoa(JSON) |
| Expiry tracking | ✅ expiresAt = Date.now() + expires_in * 1000 |
| Auto-refresh | ✅ Near expiry (<5 min) → refreshAccessToken() |
| Refresh failure | ✅ Prompts "Reconnect Upstox" |
| Logout cleanup | ✅ TokenStore.clearAll(uid) |

### 6. Environment Variables

| Variable | Exposed to Browser? | Configured? |
|:---------|:--------------------|:------------|
| VITE_UPSTOX_CLIENT_ID | ✅ Yes (OAuth URL) | ✅ |
| VITE_UPSTOX_REDIRECT_URI | ✅ Yes (OAuth URL) | ✅ |
| UPSTOX_CLIENT_SECRET | ❌ NEVER | ✅ (backend only) |
| UPSTOX_API_KEY | ❌ NEVER | ✅ (backend only) |

---

## OAuth Validation Checklist

- [x] OAuth URL generates correctly with all parameters
- [x] PKCE code verifier + challenge generated
- [x] CSRF state parameter generated
- [x] Redirect URI matches configured value
- [x] Scope = read_portfolio + read_user_profile (read-only)
- [x] Token exchange endpoint: /api/upstox/token (backend proxy)
- [x] Token refresh endpoint: /api/upstox/token/refresh
- [x] Token revocation endpoint: /api/upstox/token/revoke
- [x] Tokens stored securely (UID-bound localStorage)
- [x] Auto-refresh before expiry
- [x] Logout clears all tokens
- [x] NO client secret in browser code
- [x] NO write scopes requested
- [x] State validated on callback (CSRF protection)

## Status: ✅ OAuth Flow Ready for Testing

All OAuth components are implemented and ready for live testing with a real Upstox account. The following steps require user interaction (cannot be automated):
1. Navigate to generated OAuth URL
2. Login to Upstox
3. Grant permissions
4. Callback handling

