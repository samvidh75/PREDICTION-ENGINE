# Fixes Applied

## Hide search and alerts on public pages

The `TopNav` component now determines the current page from the `page` query parameter and computes a list of “public pages” (`landing`, `about`, `login`, `signup`).  It introduces a `showSearch` boolean that is true only when the user is authenticated and not on a public page.  The search button and search bar in the top navigation are rendered only when `showSearch` is true.  On public pages the top navigation displays the public links (Home, About, Sign in, Get started) and the “Start” button on mobile.  This change prevents unauthenticated users from opening the search overlay on login or signup pages.

Modified file:

- `src/components/navigation/TopNav.tsx`

## Improved authentication error messages

The default fallback message in `src/services/auth/authErrorMapper.ts` has been updated to instruct users to try again later or contact support when authentication fails without a recognised error code.  This provides clearer guidance compared with the previous generic message.

Modified file:

- `src/services/auth/authErrorMapper.ts`

## Deployment and configuration steps (manual)

These changes alone cannot fix the Google login errors.  The following manual configuration steps are still required:

- Add the Vercel production domains (`prediction-engine-*.vercel.app`, `www.stockstory-india.com`) to the **Authorized domains** list in Firebase Authentication.
- Define the Firebase environment variables in the Vercel project settings for the **Production** environment:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_AUTH_DOMAIN` (e.g. `stockstory-india.firebaseapp.com`)
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
- Redeploy the frontend via Vercel after updating environment variables.

## Additional UI recommendations (not implemented in this PR)

- Increase font sizes and lighten secondary text colours in Tailwind configuration to improve readability on dark backgrounds.
- Simplify landing page copy to focus on the core value proposition and remove jargon and marketing hype.
- Remove or defer features like the **Intel** button until the user is authenticated and the functionality is fully implemented.
