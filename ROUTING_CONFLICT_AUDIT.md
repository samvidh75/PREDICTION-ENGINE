# Routing Conflict Audit

This document identifies the root causes of the navigation errors, state-sync failures, and browser history bugs in the StockStory India application.

## Key Sources of Navigation Conflicts

### 1. Dual-State Navigation Drivers
The application attempts to track the active view in two separate, un-synchronized state structures:
* **URL Search Parameter (`?page=...`):** Managed in `src/App.tsx` and manipulated via `src/architecture/navigation/routeCoordinator.ts` pushState helper.
* **Layout Context View (`currentView`):** Managed in `src/context/LayoutContext.tsx` and updated via the `MapsTo` event in the navigation rail.

### 2. Mismatched Event Listeners
* `src/App.tsx` binds listeners to both `urlchange` and `popstate` to update its internal `pageKey` state when navigation buttons or link elements are clicked.
* `src/context/LayoutContext.tsx` only parses the URL query params once during initialization (`useEffect` on mount). It does **not** listen to `urlchange` or `popstate`.
* **The Conflict:** Clicking back/forward changes the URL query and updates `App.tsx`'s `pageKey`, but `LayoutContext.tsx`'s `currentView` remains locked to its previous value. This results in visual mismatches where the sidebar rail highlights one view while the main content panel displays another.

### 3. "Initialize Session" Dead-End
* **Click Action:** Clicking "Initialize Session" in `TopNav.tsx` has no click handler. In `LandingHero.tsx`, it calls `initializeSession()` in `AuthContext.tsx`.
* **State Behavior:** Since `initializeSession` only reloads Firebase's currentUser state (which is null for anonymous sessions) and sets a brief `isConnecting = true / false` switch, no route query change (`pageKey`) is ever pushed. The user is left on the same page with no login/signup credentials card mounted.

### 4. Refresh State Breakage
* **Details:** Upon browser refresh, `App.tsx` resolves authentication before layout context initialization. If the user session is cached but the query parameters are empty, the app defaults the view keys. Because `LayoutContext` initializes with `currentView = "terminal"`, any custom path details not explicitly mapped in `LayoutContext.tsx`'s startup `useEffect` fallback back to the dashboard layout.
