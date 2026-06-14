# Findings: Production UX and Auth Audit

## Blank/black page on production

The production frontend was rendering a black/blank page after deployment.  Investigation of the source code shows that the Firebase initialisation in `src/config/firebase.ts` throws an error when the required environment variables (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`) are missing.  In production builds this uncaught error causes React to crash before any UI is rendered.  When the corresponding variables were added to Vercel the blank page disappeared.

## Unnecessary search on login/signup pages

On the sign‑up and sign‑in pages the top navigation still displayed a **Search** button and **Intel** link, and pressing **Search** opened the market narrative search overlay.  This occurred because the `TopNav` component rendered the search button whenever `isAuthenticated && user` was true, without checking which page was being shown.  If a user previously had an authenticated session stored, the app would treat them as authenticated even on `login` or `signup` routes and therefore display the authenticated navigation.  This made search available on pages where it is irrelevant and confusing.

## Google login and email sign‑up failures

Clicking **Continue with Google** or creating an account via email on the production site resulted in an error: “Authentication could not be completed. Please try again.”  The client code calls `authService.signInWithGoogle()` from Firebase, which fails if the current domain is not authorised or if the Firebase configuration is incomplete.  Because the deployed domain (`prediction-engine-...vercel.app`) was not added to the Firebase Authentication authorised domains list, Google login cannot succeed.  The current error messages do not explain this to the user.

## Design and content issues

The public landing page uses dark backgrounds with neon gradients and small, pale text.  While the hero message (“Intelligence for Indian Investors”) is clear, many of the descriptive paragraphs are long and hard to read.  Small text such as the “Healthometer” and “Volatility” percentages in the search overlay has low contrast against the dark background.  The landing page lists features (“Market home”, “Daily feed”, etc.) that may overwhelm first‑time visitors.  The copy sometimes implies guaranteed investment returns.  Overall the UI feels heavy and the fonts blurred due to the dark palette and low contrast.
