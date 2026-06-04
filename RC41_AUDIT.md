# RC41 Production UX Audit

This audit evaluates the live StockStory India application from the perspective of a first-time investor, checking visual theme consistency, navigation flows, and actionable interactions.

---

## 1. Top Navigation Bar (Guest vs Authenticated States)
* **Severity**: High
* **Issue**: Unauthenticated guest users on Landing, Login, and Signup pages could see private stock search inputs and notifications indicators.
* **Root Cause**: `TopNav` rendered search options and alerts buttons unconditionally without checking authentication status.
* **Exact File**: [TopNav.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/navigation/TopNav.tsx)
* **Exact Component**: `TopNav`
* **Exact Fix**: Added a conditional branch utilizing the `isAuthenticated` flag from `useAuth()` to render guest-oriented links (About, Sign in, Create Account) for logged-out sessions, and the search query field + notification bell only for active user sessions.

---

## 2. Global Route Guarding and Hydration Flow
* **Severity**: Medium
* **Issue**: Brief flashing of the user dashboard or login state during auth session restoration on initial reload.
* **Root Cause**: `isAuthLoading` check was previously rendering sub-elements prematurely.
* **Exact File**: [App.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/App.tsx)
* **Exact Component**: `AppContent`
* **Exact Fix**: Structured a clear hydration barrier that holds rendering of protected views until the Firebase user session has finished loading and validation succeeds.

---

## 3. Sidebar Actions and Active Highlighting
* **Severity**: Low
* **Issue**: Navigation menu item highlight was not matching the query page state.
* **Root Cause**: Mismatches between internal layout state keys and URL search query parameter states.
* **Exact File**: [Sidebar.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/navigation/Sidebar.tsx)
* **Exact Component**: `Sidebar`
* **Exact Fix**: Standardized view targets (`terminal` / `dashboard`, `discovery`, `watchlist`, `portfolio`, `alerts`, `settings`) and linked query parameter states directly.

---

## 4. Mobile Navigation Drawers
* **Severity**: Low
* **Issue**: Layout margins and overlays on mobile views.
* **Root Cause**: Mobile navigation padding offsets did not dynamically account for the fixed header heights.
* **Exact File**: [AppLayout.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/navigation/AppLayout.tsx)
* **Exact Component**: `AppLayout`
* **Exact Fix**: Established fixed offset padding limits matching standard header heights.
