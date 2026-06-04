# Authentication Verification Audit

This document reports findings from the verification audit of the Firebase and Google Authentication configuration for the StockStory application.

---

## 1. Firebase Configuration & Environment Verification

| Parameter | Source/Value in Code | Status |
| :--- | :--- | :--- |
| **Firebase Project ID** | `stockstory-india` (hardcoded in `src/config/firebase.ts` with env override `VITE_FIREBASE_PROJECT_ID`) | **VERIFIED** |
| **Auth Domain** | `stockstory-india.firebaseapp.com` (hardcoded in `src/config/firebase.ts` with env override `VITE_FIREBASE_AUTH_DOMAIN`) | **VERIFIED** |
| **API Key Source** | `import.meta.env.VITE_FIREBASE_API_KEY` | **VERIFIED** |
| **Environment Variable Loading** | Loaded at runtime via Vite's `import.meta.env` mapping | **VERIFIED** |
| **GoogleAuthProvider Config** | `new GoogleAuthProvider()` initialized with scopes `profile`, `email`, custom prompt parameters, and client ID override support. | **VERIFIED** |
| **Vercel Domain Whitelisting** | Whitelist status in Firebase Console Authentication settings | **REQUIRES FIREBASE CONSOLE CHECK** |
| **Google Auth Provider Status** | Status of Google Sign-in activation in Firebase Console | **REQUIRES FIREBASE CONSOLE CHECK** |

---

## 2. Authentication Flow Execution Paths

### Flow A: "Continue with Google"
1. **Component**: `CinematicAuthGateway` ([CinematicAuthGateway.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/auth/CinematicAuthGateway.tsx))
2. **Handler Function**: `onGoogle`
3. **Auth Service Method**: `authService.signInWithGoogle` (triggers `signInWithProvider("google")` in [authService.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/auth/authService.ts))
4. **Firebase SDK Call**: `signInWithPopup(auth, canonicalGoogleProvider)` (from `firebase/auth`)
5. **Session/Analytics**: `trackAuthOutcome` evaluates `user.isNewUser` to emit either `signup_completed` or `login_completed` events via `AnalyticsCoordinator`.
6. **Redirect Target**: `onAuthed(user)` callback is invoked. In [App.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/App.tsx), the state `auth` transitions to `authenticated`, and the routing engine renders `<DashboardHub />`.

### Flow B: "Continue with Email" (Login)
1. **Component**: `CinematicAuthGateway` ([CinematicAuthGateway.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/auth/CinematicAuthGateway.tsx))
2. **Handler Function**: `onEmailLogin`
3. **Auth Service Method**: `authService.signInWithEmail` (triggers `signInWithEmail` in [authService.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/auth/authService.ts))
4. **Firebase SDK Call**: `signInWithEmailAndPassword(auth, email, password)` (from `firebase/auth`)
5. **Session/Analytics**: `trackAuthOutcome` fires the `login_completed` event via `AnalyticsCoordinator`.
6. **Redirect Target**: `onAuthed(user)` callback is invoked. In [App.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/App.tsx), the state transitions to render `<DashboardHub />`.

### Flow C: "Create account" (Signup)
1. **Component**: `CinematicAuthGateway` ([CinematicAuthGateway.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/auth/CinematicAuthGateway.tsx))
2. **Handler Function**: `onSignup`
3. **Auth Service Method**: `authService.signUpWithEmail` (triggers `signUpWithEmail` in [authService.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/auth/authService.ts))
4. **Firebase SDK Call**:
   - `createUserWithEmailAndPassword(auth, email, password)`
   - `updateProfile(user, { displayName })`
5. **Session/Analytics**: `trackAuthOutcome` fires the `signup_completed` event via `AnalyticsCoordinator`.
6. **Redirect Target**: `onAuthed(user)` callback is invoked. In [App.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/App.tsx), the state transitions to render `<DashboardHub />`.

---

## 3. Real User Capabilities Matrix

| User Action | Status | Notes |
| :--- | :--- | :--- |
| **Create Account** | **VERIFIED** | Code supports custom signup handlers and routes to standard auth creation endpoints. |
| **Sign in with Google** | **REQUIRES FIREBASE CONSOLE CHECK** | Frontend code is fully verified. However, operations will fail with `auth/unauthorized-domain` in production if the host domain is not whitelisted in the Firebase console. |
| **Sign in with Email** | **VERIFIED** | Code successfully calls Firebase email auth. |
| **Refresh & Keep Session** | **VERIFIED** | `authService.restoreSession` restores state asynchronously on mount via `onAuthStateChanged` and reads from localStorage sessions. |
