# Analytics Implementation Report

This report outlines the implementation of Closed Beta engagement tracking events for StockStory.

---

## 1. Events Tracked & Schema

The following analytics events have been wired to the telemetry layer via the centralized `AnalyticsCoordinator`:

| Event Name | Trigger Context | Payload Fields |
| :--- | :--- | :--- |
| `signup_completed` | User successfully registers an account via email signup or Google/Apple sign-in. | `uid`, `method` (email / google / apple), `timestamp` |
| `login_completed` | User logs into an active session (via email login, Google/Apple sign-in, or password reset restoration). | `uid`, `timestamp` |
| `dashboard_viewed` | Main dashboard terminal loads. | `uid`, `device_type` (desktop / mobile), `timestamp` |
| `company_page_viewed` | User opens a stock booklet view (recorded on mount/unmount to calculate reading duration). | `uid`, `symbol`, `duration_ms`, `timestamp` |
| `watchlist_created` | User saves a new custom watchlist. | `uid`, `watchlist_id`, `ticker_count`, `timestamp` |
| `portfolio_created` | User updates portfolio holdings/weights. | `uid`, `position_count`, `average_quality_factor`, `timestamp` |
| `alert_created` | A system alert is generated and dispatched to the user. | `uid`, `alert_type` (category), `timestamp` |

---

## 2. Modified Files & Trigger Locations

### 1. [authService.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/auth/authService.ts)
* **Change**: Added `isNewUser` key to `AuthUser` type and leveraged Firebase `getAdditionalUserInfo` to record whether standard provider logins or email signups represent registration events.
* **Line Range**: L20, L66, L107-L140

### 2. [CinematicAuthGateway.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/auth/CinematicAuthGateway.tsx)
* **Change**: Wired `signup_completed` and `login_completed` event trackers dynamically inside standard social/email registration, login, and reset handlers based on `user.isNewUser`.
* **Line Range**: L105-L137 (helper & hook), L153-L200 (handlers), L250-L260 (reset password handler)

### 3. [DashboardHub.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/views/DashboardHub.tsx)
* **Change**: Triggered `dashboard_viewed` inside the mount `useEffect` callback, dynamically assessing user identity and layout device size (desktop/mobile).
* **Line Range**: L38-L48

### 4. [CompanySuperpage.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/views/CompanySuperpage.tsx)
* **Change**: Registered `company_page_viewed` event with a duration tracker on unmount using `useEffect` boundary matching layout constraints.
* **Line Range**: L42-L55

### 5. [watchlistStore.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/watchlistStore.ts)
* **Change**: Logged `watchlist_created` inside `createWatchlist` utility tracking lists and ticker metrics.
* **Line Range**: L105-L115

### 6. [PortfolioEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/PortfolioEngine.ts)
* **Change**: Captured `portfolio_created` inside `saveHoldings` workflow, computing the real-time average portfolio quality factor using `CompanyDNAEngine` and `StockRegistry`.
* **Line Range**: L70-L90

### 7. [AlertEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/AlertEngine.ts)
* **Change**: Wired `alert_created` tracking inside the core alert generation workflow `generateAlert`.
* **Line Range**: L143-L151

---

## 3. Verification & Verification Script

* **Typechecking**: `npm run typecheck` resolved successfully (Exit Code 0).
* **Production Build**: `npm run build` compiled successfully (Exit Code 0).
