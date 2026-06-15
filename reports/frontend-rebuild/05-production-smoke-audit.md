# Production Frontend Smoke Audit

## Production URLs Tested

- `https://www.stockstory-india.com`
- `https://stockstory-india.com`
- Local production bundle preview after fixes: `http://127.0.0.1:4173`

## Pages / Flows Tested

- Public landing page load, copy, CTA presence, mobile layout, and console state.
- Signup page load, Google button presence, email/password field presence, mobile layout, and readable auth error state.
- Login page load, Google button presence, email/password field presence, protected-route redirect behavior, mobile layout, and readable auth error state.
- Protected Search route unauthenticated redirect to Login.
- Public/auth page backend telemetry behavior.

Authenticated Dashboard, Search, Watchlist, Settings, and company research flows could not be fully tested on production because the live deployment was missing required Firebase client configuration at audit time, preventing real sign-in.

## Issues Found

- Both production domains returned `200` HTML but rendered a blank React root.
- Browser console showed `Firebase: Error (auth/invalid-api-key)` and a missing `VITE_FIREBASE_API_KEY` diagnostic.
- Auth initialization could keep the app from rendering when Firebase client config was missing.
- Follow-up production re-poll showed the first pushed fix removed the console diagnostic but the deployed page still blanked because `getAuth()` was still being instantiated at module load with invalid config.
- Public/auth pages triggered `/api/intelligence/market` through the global confidence layer, causing backend API noise on pages that should be static and public.
- Auth diagnostic logging used console errors for handled sign-in failures, adding avoidable console noise during smoke testing.

## Fixes Made

- Added a Firebase client configuration availability flag.
- Made Firebase persistence resolve safely when client auth config is unavailable.
- Prevented Firebase Auth from being instantiated unless the client configuration is valid.
- Guarded the shared Firebase auth client accessor so auth calls fail closed with a mapped auth error when config is unavailable.
- Updated AuthContext to fail closed, clear loading, and render public/auth pages with a readable auth-unavailable state when Firebase client config is missing.
- Guarded AuthContext session sync, initialization, and logout paths from touching Firebase Auth when config is unavailable.
- Added an auth-service guard so login/signup actions map missing Firebase config to a user-readable auth error.
- Paused the global confidence polling layer on public and unauthenticated pages.
- Changed handled auth diagnostics from console errors to warnings.

## Files Changed

- `src/App.tsx`
- `src/config/firebase.ts`
- `src/context/AuthContext.tsx`
- `src/services/auth/authErrorMapper.ts`
- `src/services/auth/authService.ts`
- `reports/frontend-rebuild/05-production-smoke-audit.md`

## Backend / Scoring / Provider Logic Confirmation

Backend scoring algorithms, provider ingestion, API contracts, data models, ranking formulas, Firebase config values, and Vercel settings were not changed.

## Verification Command Results

| Command | Result |
| --- | --- |
| `npm run typecheck:all` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | Pass: 71 test files, 781 tests |
| `npm run validate:hygiene` | Pass: 0 secret errors, 0 hazard warnings |
| `npm run build:frontend` | Pass |
| `npm run build:backend` | Pass |

Note: `npm run build:frontend` emitted Vite's existing warning that `NODE_ENV=production` is not supported in `.env`, but the build completed successfully.

## Smoke Results After Local Production Bundle Fix

- Landing rendered with no console errors or page errors.
- Signup rendered with no console errors or page errors.
- Login rendered with no console errors or page errors.
- Protected Search redirected to Login when unauthenticated.
- Auth form errors rendered as readable inline alerts.
- An explicit missing-Firebase production build (`VITE_FIREBASE_API_KEY=`, `VITE_FIREBASE_APP_ID=`, `VITE_FIREBASE_MESSAGING_SENDER_ID=`) rendered Landing, Signup, and Login with no console errors and no page errors.

## Post-Push Production Confirmation

- `https://www.stockstory-india.com` served asset `/assets/index-CKEV4-B8.js`, rendered the landing page, and had no console errors or page errors.
- `https://stockstory-india.com` served asset `/assets/index-CKEV4-B8.js`, rendered the landing page, and had no console errors or page errors.
