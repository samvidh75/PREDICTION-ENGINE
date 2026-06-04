# Alert Reality Audit

This audit verifies whether alerts trigger, where they are stored, where they are generated, and where they are rendered.

---

## Alert Feature Verification

### 1. Do alerts actually trigger?
* **Verdict**: **Partially Implemented (Simulated/Mocked)**
* **Details**:
  * The system has pre-configured static alerts (e.g. for `RELIANCE`, `INFY`, `HAL`, and `BEL`).
  * While the class supports programmatic generation of alerts via `AlertEngine.generateAlert()`, there is no active background worker daemon executing database checks on every tick to insert new alerts into PostgreSQL in production.

### 2. Where are they stored?
* **Verdict**: **In-Memory Only**
* **File Path**: [AlertEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/AlertEngine.ts)
* **Variable**: `AlertEngine.alerts` (static array of `SmartAlert` objects).
* **Database Tables**: No alerts table exists in PostgreSQL.

### 3. Where are they generated?
* **File Path**: [AlertEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/AlertEngine.ts)
* **Method**: `generateAlert(type, symbol, body)`

### 4. Where are they rendered?
* **File Path**: [WatchlistPage.tsx](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/pages/WatchlistPage.tsx) (Column 3 displays "Watchlist Alerts" by filtering for type "Watchlist Activity" or "Large Movement").
