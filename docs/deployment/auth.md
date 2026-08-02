# Authentication — Production Deployment Guide

## Firebase Auth Providers Required

| Provider       | Status  | Notes                                   |
|----------------|---------|------------------------------------------|
| Google         | Enabled | OAuth popup + redirect fallback          |
| Email/Password | Enabled | Sign-up, sign-in, password reset         |

Enable these in [Firebase Console → Authentication → Sign-in method](https://console.firebase.google.com/project/stockstory-india/authentication/providers).

## Vercel Environment Variables

Set these in **Vercel Project Settings → Environment Variables** for both **Production** and **Preview**:

### Required (public Firebase config)

| Variable                        | Source                                                              |
|---------------------------------|---------------------------------------------------------------------|
| `VITE_FIREBASE_API_KEY`         | Firebase Console → Project Settings → General → Your apps → Web     |
| `VITE_FIREBASE_AUTH_DOMAIN`     | `stockstory-india.firebaseapp.com`                                  |
| `VITE_FIREBASE_PROJECT_ID`      | `stockstory-india`                                                  |
| `VITE_FIREBASE_STORAGE_BUCKET`  | `stockstory-india.firebasestorage.app`                              |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase Web config                                        |
| `VITE_FIREBASE_APP_ID`          | From Firebase Web config                                            |

All `VITE_FIREBASE_*` values are **public** Firebase project identifiers — they are served to the browser. They are not secrets. Never put Firebase Admin SDK private keys in `VITE_*` variables.

### Local-only (not set in Vercel)

- `VITE_AUTH_MODE` — was previously set as `demo` but is not read by any code; omit in production.

## Authorized Domains

The following domains must be in Firebase Auth authorized domains for popup/redirect to work:

| Domain                         | Status        |
|--------------------------------|---------------|
| `stockstory-india.com`         | Authorized    |
| `www.stockstory-india.com`     | Authorized    |
| `stockstory-india.firebaseapp.com` | Default  |
| `localhost`                    | Default (dev) |
| Vercel preview domains         | Auto-authorized via Vercel env |

Authorized domains are managed in the Firebase Console under Authentication → Settings (requires Identity Platform upgrade to view/edit in the new UI; otherwise they are auto-managed).

## Google OAuth Popup Behavior

- The popup opens to `accounts.google.com` and on success redirects to `stockstory-india.firebaseapp.com/__/auth/handler`.
- The auth handler sends the result back to the main window via `postMessage`.
- If popup is blocked by the browser, the app falls back to `signInWithRedirect`.

### COOP Warning

`Cross-Origin-Opener-Policy: same-origin` is set by the Railway edge proxy. This produces a non-blocking diagnostic warning:

```
Cross-Origin-Opener-Policy policy would block the window.close call.
```

**This warning is cosmetic.** It does not block Google sign-in. The `postMessage` auth result delivery works independently from `popup.closed`. Do not weaken the COOP header — weakening it would reduce security without benefit.

## Verification Steps

### Automated

```bash
# Production smoke checks (frontend, Vercel, Railway)
npm run smoke:production

# E2E tests (mocked auth, route/session behavior)
npm run test:e2e

# Full test suite
npm run test:unit
```

### Manual

1. Open `https://www.stockstory-india.com/login`
2. Click **Continue with Google**
3. Complete Google sign-in — verify dashboard renders
4. Sign out — verify redirect to landing
5. Navigate to protected route — verify redirect to login with context
6. Sign in with email/password (create account first if needed)
7. Verify settings page shows signed-in email and name
8. Verify password reset flow

## Secret Handling

- **Never commit** `.env` files containing real credentials.
- **Never import** backend-only secrets (`UPSTOX_CLIENT_SECRET`, `DATABASE_URL`, etc.) into frontend code.
- Firebase Admin SDK private keys must only be used server-side and never exposed in VITE_* variables.
- The backend `requireAuthenticatedUser.ts` extracts Firebase ID tokens from the `Authorization: Bearer` header and verifies them via Firebase Admin SDK.
- The frontend `authenticatedFetch.ts` attaches the Bearer token but never stores it in localStorage or logs it.
- Error messages to users must never include raw tokens or secret values.

## Token Architecture

1. **Frontend** calls `getIdToken()` on the Firebase `User` object.
2. The token is registered with `registerTokenProvider` in `authenticatedFetch.ts` during auth initialization.
3. `authenticatedFetchJSON` adds `Authorization: Bearer <token>` to API requests.
4. **Backend** `requireAuthenticatedUser` preHandler verifies the token via Firebase Admin SDK.
5. Expired tokens result in a 401 response; the frontend must re-authenticate.
