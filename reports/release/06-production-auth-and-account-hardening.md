# Release 06 — Production Auth and Account Hardening

## Baseline
- Commit: `d42bc58b`
- Repo: clean, no staged changes
- Smoke: 5/5
- E2E: 36/36
- Build: frontend builds clean

## Firebase/Vercel Auth Env Audit
| Finding | Status |
|---------|--------|
| `VITE_FIREBASE_*` vars set correctly in Vercel Production | ✅ |
| `VITE_AUTH_MODE=demo` in `.env` but never read by code | ✅ Removed dead config |
| `.env.example` used server-side naming (`FIREBASE_*`) instead of `VITE_FIREBASE_*` | ✅ Fixed to document `VITE_FIREBASE_*` with clear public/private sections |
| `registerTokenProvider` never called — all `authenticatedFetch` calls would throw | ✅ **Critical bug fixed** |
| `authErrorMapper` comprehensive but untested | ✅ 25 unit tests added |
| `isFirebaseClientConfigured` checks valid env at init | ✅ No change needed |
| No `_headers` file for Vercel (CSP server-side only) | ✅ Noted — COOP from Railway, not Vercel |

## Google Auth Production Status
- Popup opens to `accounts.google.com` ✅
- OAuth code returned to `stockstory-india.firebaseapp.com/__/auth/handler` ✅
- `postMessage` delivers auth result to main window ✅
- Dashboard renders with authenticated session (Google, samvidh75@gmail.com) ✅
- No unauthorized domain errors — domain is authorized ✅
- **No "Missing required environment variables" warning** after adding `VITE_FIREBASE_API_KEY` to Vercel Production ✅

## Email/Password Auth Status
- Email/Password provider enabled in Firebase Console ✅
- Sign-up, sign-in, password reset all functional ✅
- Error mapping covers all standard Firebase auth codes ✅

## COOP Warning Decision
- `Cross-Origin-Opener-Policy: same-origin` from Railway edge proxy produces non-fatal diagnostic
- `postMessage` auth delivery works independently from `popup.closed`
- **Decision**: Leave headers unchanged. Warning is cosmetic. Weakening COOP would reduce security without benefit.

## Auth UX Improvements
- `CinematicAuthGateway`: Google button disabled while busy (prevents double-click), popup-blocked fallback to redirect, all errors mapped via `mapAuthError`, password visibility toggle, accessible error/success alerts
- `AuthContext`: Loading timeout diagnostic (30s), session expiry detection (7d), session restoration from localStorage, session-changed events for cross-tab sync
- `App.tsx`: `sanitizeReturnTo` prevents unsafe redirects, protected route redirect preserves return context, session-expired redirect renders user-friendly message

## Authenticated API Token Audit
- `registerTokenProvider` was **never called** — all `authenticatedFetch`, `authenticatedFetchJSON`, `authenticatedFetchOnlyIfSignedIn` calls would throw `AUTH_MISSING: Token provider not registered`
- **Fixed**: `AuthContext` now calls `registerTokenProvider` on:
  - `getRedirectResult` success (redirect flow)
  - `onAuthStateChanged` with user (popup/refresh flow)
  - `initializeSession` (explicit session init)
- Token is obtained via `firebaseUser.getIdToken()` — never stored in localStorage or logged
- Backend `requireAuthenticatedUser` verifies token via Firebase Admin SDK
- 401/403: `authenticatedFetchJSON` throws `body.code || HTTP ${status}` — mapped error displayed
- Token refresh errors: handled by Firebase SDK natively

## Settings/Account Improvements
- Profile tab shows real email (read-only) and display name from Firebase
- "Profile name is stored locally" label clarifies local-only behavior
- Appearance tab: fixed light theme, no dark mode (explicit)
- Security tab: password reset sends to registered email
- No raw Firebase field names (`uid`, `providerData`, `isAnonymous`) in UI
- No disabled controls without explanation
- No fake profile save or cloud-synced state
- Sign-out available from ProfileButton dropdown and Sidebar

## Auth Docs
- Created `docs/deployment/auth.md`
- Covers: required providers, Vercel env vars, authorized domains, Google popup behavior, COOP warning, verification steps, secret handling, token architecture

## Tests Added/Updated
| File | Tests | Status |
|------|-------|--------|
| `src/services/auth/__tests__/authErrorMapper.test.ts` | 25 | NEW — covers all error codes, message fallbacks, raw-code exclusion |
| `src/services/auth/__tests__/authenticatedFetch.test.ts` | 4 | NEW — covers registerTokenProvider contract |
| `src/pages/SettingsPage.test.tsx` | +3 | ENHANCED — verifies email/name display, no raw Firebase fields, local-only label |

**Total**: 86 test files, 905 tests (up from 84 files, 874 tests = +31 tests)

## E2E Result
- 36/36 passed
- Auth boundary tests (unauthenticated → redirect, authenticated → render)
- Route smoke, search, company page, rankings, authenticated shell, settings, watchlist, fallback routes
- No automated Google auth in E2E (no live OAuth credentials) — documented in auth.md

## Production Smoke Result
```
✓ FRONTEND=ok
✓ VERCEL_HEALTH=ok
✓ VERCEL_COVERAGE=ok
✓ RAILWAY_HEALTH=ok
✓ RAILWAY_COVERAGE=ok
```

## Manual Production Auth QA
1. Cleared localStorage, visited `https://www.stockstory-india.com/login?page=signup`
2. Clicked "Continue with Google" — popup opened to `accounts.google.com`
3. Completed Google OAuth — redirected to dashboard with session
4. Verified dashboard renders signals, watchlist, recent activity
5. Sign out — redirected to landing
6. Protected route → redirect to login with context
7. No "Missing required environment variables" warning in console
8. COOP warning appears but does not block sign-in

## Full Verification Results
| Check | Result |
|-------|--------|
| `typecheck:all` | ✅ All 5 tsconfigs pass |
| `lint` | ✅ No errors |
| `test:unit` | ✅ 905/905 passed (86 files) |
| `validate:hygiene` | ✅ No secrets detected |
| `build:frontend` | ✅ Vite build clean |
| `build:backend` | ✅ Backend compile clean |
| `test:e2e` | ✅ 36/36 passed |
| `smoke:production` | ✅ 5/5 checks pass |

## Remaining Blockers
- None

## Confirmations
- No fake data added
- No scoring/ranking/prediction formula changes
- No provider ingestion algorithm changes
- No secrets touched
- No scoring/ranking/prediction algorithm changes
- No Railway config changes
- No Firebase console settings changed from code
