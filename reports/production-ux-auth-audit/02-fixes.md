# Fixes Applied

## Public navigation no longer exposes app-only actions

`TopNav` now reads the current page from the URL and treats `landing`, `about`, `login`, and `signup` as public pages. Search, alerts, and profile actions render only inside the authenticated app shell. This prevents stale sessions from making Search/Intel-style app controls appear on the login and signup screens.

Modified file:

- `src/components/navigation/TopNav.tsx`

## Auth pages no longer auto-redirect from stale sessions

The login and signup pages now pass `restoreOnMount={false}` into `CinematicAuthGateway`. This keeps the auth form stable and avoids immediately restoring a previous session when the user explicitly opens a public auth page.

Modified files:

- `src/pages/LoginPage.tsx`
- `src/pages/SignupPage.tsx`

## Authentication error messages are more actionable

Unknown auth failures now produce a clearer fallback message. Firebase-specific failures for unauthorized domains, disabled providers, invalid API keys, and app authorization issues now point to the exact Firebase/Vercel configuration area that needs to be checked.

Modified file:

- `src/services/auth/authErrorMapper.ts`

## Public landing copy and readability simplified

The landing page has been simplified to reduce jargon and avoid overpromising. The hero headline now states the product plainly, secondary text is brighter, and the product promise is framed as research support rather than investment advice.

Modified file:

- `src/pages/PublicLandingPage.tsx`

## Manual production configuration still required

Code cannot authorize Firebase domains by itself. Complete these external steps before testing Google/email auth in production:

- Add the deployed Vercel and custom domains to Firebase Authentication authorized domains.
- Enable Google sign-in in Firebase Authentication.
- Enable Email/Password sign-in in Firebase Authentication.
- Add the required Vercel Production env vars:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
- Redeploy after changing Vercel environment variables.
