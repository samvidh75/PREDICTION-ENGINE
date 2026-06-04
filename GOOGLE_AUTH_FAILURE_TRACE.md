# Google Authentication Failure Trace

## Execution path

1. **Button component**
   - `src/components/auth/CinematicAuthGateway.tsx`
   - The `"Continue with Google"` button calls `onGoogle()`.

2. **Click handler**
   - `onGoogle()` logs:
     - `Google login started`
   - It then calls:
     - `authService.signInWithGoogle()`

3. **Auth service**
   - `src/services/auth/authService.ts`
   - `signInWithGoogle()` delegates to:
     - `signInWithProvider("google")`
   - The Google branch logs:
     - `Google login started`
     - `Google provider created`
     - `Firebase popup opened`

4. **Firebase SDK call**
   - `signInWithPopup(auth, canonicalGoogleProvider)`
   - `canonicalGoogleProvider` is created in:
     - `src/config/firebase.ts`
   - The provider is a `GoogleAuthProvider` with:
     - `prompt=select_account`
     - `profile` and `email` scopes
   - The code does **not** use `signInWithRedirect()` anywhere in the active Google login path.

## What was verified

- `signInWithPopup()` is being used.
- `signInWithRedirect()` is **not** being used in the active Google login path.
- `GoogleAuthProvider` is being used.
- The Firebase auth client is initialized from:
  - `src/config/firebase.ts`
  - via `src/services/auth/firebaseClient.ts`
- All `VITE_FIREBASE_*` values were present in the runtime trace:
  - `hasApiKey: true`
  - `hasMessagingSenderId: true`
  - `hasAppId: true`
  - `hasAuthDomain: true`
  - `hasProjectId: true`
  - `hasStorageBucket: true`
  - `hasGoogleClientId: true`

## Temporary diagnostic logging added

### `src/config/firebase.ts`
- Logged Firebase env presence at bootstrap.
- Logged when the Google provider is created.

### `src/components/auth/CinematicAuthGateway.tsx`
- Logged:
  - `Google login started`

### `src/services/auth/authService.ts`
- Logged:
  - `Google login started`
  - `Google provider created`
  - `Firebase popup opened`
  - `Firebase auth success`
- Added structured logging for Firebase errors if the SDK throws.

## Observed runtime behavior

From the Puppeteer trace:

- Main page loaded successfully.
- Clicking Google triggered the popup flow.
- The popup opened to:

  `https://stockstory-india.firebaseapp.com/__/auth/handler?...&authType=signInViaPopup...`

- The popup then logged:
  - `Failed to load resource: the server responded with a status of 404 ()`
  - `Failed to load resource: the server responded with a status of 404 ()`

- The main page logged:
  - `Cross-Origin-Opener-Policy policy would block the window.closed call.`

- The popup closed immediately afterward.

## Actual Firebase error

No usable Firebase SDK error object was emitted into the trace window.

What was **captured**:
- Browser-side 404s inside the Firebase auth handler popup
- COOP / `window.closed` blocking errors in the main page
- Immediate popup closure

What was **not captured**:
- A Firebase error object with a stable `code` / `message` from the SDK catch path

## Root cause

The failure occurs in the popup-based OAuth handoff, but the SDK error did not surface clearly in the trace. The strongest evidence is:

- the auth handler popup opens
- it fails immediately with resource 404s
- the main page reports COOP blocking on `window.closed`
- the popup closes before any successful account chooser/login completes

This points to a popup handoff problem rather than a missing env-var problem.

## Recommended fix

1. **Investigate the Firebase auth-domain / popup callback path**
   - Verify the Firebase project’s authorized domains and popup handler behavior.
   - Confirm the Firebase console configuration for the web app is complete.

2. **Eliminate the popup/COOP fragility**
   - Prefer a redirect-based flow if the hosting environment enforces COOP/COEP or similar cross-origin restrictions.
   - If popup must remain, ensure the app is served without headers that break `window.closed` communication.

3. **Keep the structured diagnostics**
   - The temporary logs are useful and should be retained until the exact SDK error is captured in a clean run.

4. **Re-run after any auth-console or hosting-header change**
   - The next trace should capture whether Firebase throws:
     - `auth/unauthorized-domain`
     - `auth/popup-closed-by-user`
     - or another popup/auth-handler error
