# Routing Rewrite Plan

This plan establishes a single, stable source of truth for navigation across StockStory India.

## Routing System Synchronization Strategy

To resolve navigation bugs, the layout routing state must be derived from the browser URL, making URL parameters the single source of truth:

```
  [Browser URL Change / popstate] ────> [App.tsx / pageKey Sync]
                                                │
                                                ▼
                                    [LayoutContext / currentView Sync]
```

---

## Route Migration Specifications

| Target Route Path | Current Implementation | Target Implementation | Migration Strategy |
| :--- | :--- | :--- | :--- |
| `/` (About) | Uses `?page=about` or defaults to landing screen. | Parses URL parameter `page=about` as main public entry. | Set `pageKey === "about"` as the default page when unauthenticated. |
| `/login` | Silently toggles auth modal overlay. | Direct route `?page=login` mounting standalone card. | Build standalone page; handle redirect to dashboard. |
| `/signup` | Silently toggles auth modal overlay. | Direct route `?page=signup` mounting registration card. | Build standalone page; handle redirect to dashboard. |
| `/dashboard` | Switch view via `currentView = "terminal"`. | Direct route `?page=dashboard` mapping `currentView` to `"terminal"`. | Sync `currentView` state with URL whenever URL changes. |
| `/discovery` | Switches via `currentView = "discovery"`. | Direct route `?page=discovery` mapping `currentView` to `"discovery"`. | Bind rail click to update URL parameters. |
| `/stock/:symbol` | Query param `?page=stock&id=...` | Direct route `?page=stock&id=...` | Align `currentView` to `"stories"` or stock detail view. |
| `/watchlist` | Switch view via `currentView = "watchlist"`. | Direct route `?page=watchlist`. | Align view state on mount/popstate. |
| `/portfolio` | Switch view via `currentView = "portfolio"`. | Direct route `?page=portfolio`. | Align view state on mount/popstate. |
| `/alerts` | Switch view via `currentView = "alerts"`. | Direct route `?page=alerts`. | Align view state on mount/popstate. |
| `/settings` | Switch view via `currentView = "settings"`. | Direct route `?page=settings`. | Align view state on mount/popstate. |

---

## Root Cause Analyses

### 1. Why "Initialize Session" Reaches a Dead End
* **Issue:** The click triggers `initializeSession()`, which attempts to fetch/refresh the Firebase session without prompting credentials. Since it doesn't push a `/login` or `?page=login` route query, it finishes in a silent error/timeout state.
* **Resolution:** Re-route the click handler to push `page=login` into the URL query parameters.

### 2. Why Browser Refreshes Break State
* **Issue:** `LayoutContext` initializes independent of the current URL query, falling back to a default `currentView = "terminal"`. The visual state and URL parameters go out of sync immediately.
* **Resolution:** Parse the active URL query parameters during `LayoutContext` mount, and write a browser synchronization routine mapping `page` values directly to `currentView` values.

### 3. Why Back/Forward Navigation is Inconsistent
* **Issue:** Only `App.tsx` listens for the `popstate` and `urlchange` events. `LayoutContext` does not, leaving `currentView` stale.
* **Resolution:** Add a global `urlchange` and `popstate` event listener inside `LayoutContext.tsx` that triggers the `MapsTo()` context state updates dynamically.
