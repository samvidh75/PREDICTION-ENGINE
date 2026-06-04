# Watchlist Reality Audit

This audit verifies which watchlist features are actually implemented in the codebase and which are only simulated.

---

## Watchlist Feature Audit

### 1. Can users create custom watchlists?
* **Verdict**: **Partially Implemented (In-Memory Only)**
* **Implementation Details**:
  * **File Path**: [WatchlistEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/WatchlistEngine.ts)
  * **Class**: `WatchlistEngine`
  * **Method**: `createWatchlist(name: string)`
  * **UI Component**: [WatchlistPage.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/pages/WatchlistPage.tsx)
  * **Constraint**: The new watchlist is appended to a static array `WatchlistEngine.watchlists` in memory. It is **not** persisted to PostgreSQL or localStorage, so custom watchlists reset on page refresh.

### 2. Can users edit watchlists?
* **Verdict**: **Partially Implemented (In-Memory Only)**
* **Implementation Details**:
  * **File Path**: [WatchlistEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/WatchlistEngine.ts)
  * **Method**: `renameWatchlist(id: string, name: string)`
  * **Constraint**: Renaming is executed on the in-memory static list and resets upon browser reload.

### 3. Can users delete watchlists?
* **Verdict**: **Partially Implemented (In-Memory Only)**
* **Implementation Details**:
  * **File Path**: [WatchlistEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/WatchlistEngine.ts)
  * **Method**: `archiveWatchlist(id: string)` (filters out the list from view).
  * **Constraint**: Resets upon browser reload.

### 4. Can users pin watchlists?
* **Verdict**: **Partially Implemented (In-Memory Only)**
* **Implementation Details**:
  * **File Path**: [WatchlistEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/WatchlistEngine.ts)
  * **Method**: `toggleFavourite(id: string)`
  * **Constraint**: Marks the list as favorite in memory but resets on page reload.

### 5. Can users persist watchlists after refresh?
* **Verdict**: **Yes (For default single watchlist only)**
* **Implementation Details**:
  * **File Path**: [watchlistStore.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/watchlistStore.ts)
  * **Functions**: `addTickerToWatchlist(ticker, uid)`, `removeTickerFromWatchlist(ticker, uid)`, `getWatchlist(uid)`.
  * **Store Key**: `stockstory_watchlist_v1_${uid}` in `window.localStorage`.
  * **UI Sync Hook**: `subscribeWatchlist(fn)` (adds custom window listener to sync lists across open browser tabs).
