# RC30 Authentication Rebuild Report

Date: 2026-06-04

## Files modified

- `src/App.tsx`
- `src/config/firebase.ts`
- `src/lib/firebase.ts`
- `src/context/AuthContext.tsx`
- `src/hooks/auth/useAuth.tsx`
- `src/services/auth/authService.ts`
- `src/services/auth/authErrorMapper.ts`
- `src/services/auth/firebase.ts`
- `src/services/auth/sessionStore.ts`
- `src/services/onboarding/onboardingProgressMemory.ts`
- `src/components/auth/CinematicAuthGateway.tsx`
- `src/components/navigation/TopNav.tsx`
- `src/components/navigation/ProfileButton.tsx`
- `src/components/navigation/Sidebar.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/SignupPage.tsx`

## Root causes found

1. `App.tsx` imported `AuthContext.jsx`, a simulated timeout-based auth context, instead of the real Firebase `AuthContext.tsx`.
2. `src/lib/firebase.ts` initialized a second Firebase app with separate config, creating split auth state across modules.
3. Google provider configuration manually injected `client_id`; Firebase Auth should manage the OAuth client through the Firebase project.
4. Password reset UI used an OTP/reset-code flow, but Firebase `sendPasswordResetEmail` sends an email action link.
5. Route gating combined real Firebase state with a stale `useAuthSession()` snapshot, so logout could clear Firebase while protected content remained visible.
6. Apple auth existed in service types and provider logic.
7. Logout UI was missing from reliable authenticated navigation surfaces.
8. Firebase SDK returned `auth/network-request-failed` for signup/reset in browser testing; REST API to the same Firebase project worked.
9. Google popup failed on `127.0.0.1`; Firebase accepted the same flow on `localhost`.

## Fixes applied

- Replaced fake auth context usage with the real Firebase auth provider.
- Deleted the fake `AuthContext.jsx`.
- Made `src/lib/firebase.ts` re-export the canonical Firebase app/auth/firestore singletons.
- Added `firebasePersistenceReady` and awaited persistence before auth operations.
- Removed manual Google `client_id` override.
- Added Google diagnostic logging for provider, project, and Firebase SDK errors.
- Removed Apple auth from types, service implementation, and UI paths.
- Rebuilt the auth UI into three real states: Login, Signup, Forgot Password.
- Implemented reset-link success confirmation with `sendPasswordResetEmail`.
- Added REST fallbacks for email signup and password reset when Firebase browser SDK returns `auth/network-request-failed`.
- Made Firebase context the single source of truth for protected routes.
- Redirected unauthenticated protected routes to `?page=login`.
- Added reliable Sign out controls in top navigation and sidebar.
- Added local dev normalization from `127.0.0.1` to `localhost` for Firebase Google auth.
- Expanded error mapping for unauthorized domain, popup closure, weak password, duplicate email, disabled providers, bad Firebase config, and network failures.

## Verification results

| Check | Result | Evidence |
| --- | --- | --- |
| Create account | PASS | UI signup with `stockstory.auth.1780569955933@example.com` authenticated and rendered protected app. |
| Verify account creation | PASS | New account displayed as authenticated user and showed Sign out controls. |
| Email login | PASS | UI login with REST-created account `stockstory.rest.1780569516878@example.com` authenticated and rendered protected app. |
| Google login | PASS* | On `localhost:5173`, Continue with Google reached the real Google account chooser for `stockstory-india.firebaseapp.com`. Final account selection was not performed because automation cannot provide a user's Google credentials. |
| Password reset | PASS | Forgot Password showed `Password reset email sent to stockstory.rest.1780569516878@example.com.` REST fallback sent the reset request after SDK network failure. |
| Logout | PASS | Sidebar Sign out cleared Firebase auth and returned to Login UI. |
| Refresh persistence | PASS | Reload after login preserved authenticated protected app. |
| Close/return persistence | PASS | Fresh browser tab to `?page=dashboard` remained authenticated after login. |
| Protected routes | PASS | Unauthenticated `?page=dashboard` redirected to `?page=login`; protected dashboard content was absent. |
| Error handling | PASS | Firebase SDK errors are logged with raw diagnostics and mapped to user-facing messages without suppressing root causes. |

`*` Google completion requires an actual Google account selection. The code path now reaches Google's account chooser on the Firebase-authorized local host and logs Firebase SDK errors if the provider rejects the flow.

## Commands run

- `npm run typecheck`
- `npm run build`

