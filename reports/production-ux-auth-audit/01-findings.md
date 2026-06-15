# Findings: Production UX and Auth Audit

## Blank/black page on production

The production frontend can render a black/blank page when Firebase initialisation fails before React paints the app. The Firebase bootstrap requires the production Vercel environment to include the expected `VITE_FIREBASE_*` variables.

## Unnecessary search on login/signup pages

On the sign-up and sign-in pages the top navigation displayed app-only actions, including search. This happened because the nav was keyed only from auth state and did not also check whether the current route was a public route. A stale restored session therefore made public pages show authenticated controls.

## Google login and email sign-up failures

Clicking Google login or creating an email account produced a generic auth failure. The likely production root causes are external Firebase configuration issues: the deployment domain is not authorized in Firebase Authentication, Google provider is not enabled, Email/Password provider is not enabled, or Vercel production Firebase env vars are incomplete.

## Design and content issues

The first public version used dense language, low-contrast secondary text, and several app-only controls before the user had signed in. The landing page copy has been reduced and reframed as research support, not investment advice.
