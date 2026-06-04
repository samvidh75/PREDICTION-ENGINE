# Investor Memory Reality Audit

This audit documents the actual implementation status of bookmarks, research notes, saved narratives, and search history in the running product.

---

## Memory Feature Audit

### 1. Saved Companies / Watchlist Bookmark
* **Verdict**: **Implemented**
* **File Path**: [watchlistStore.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/watchlistStore.ts)
* **Storage Key**: `stockstory_watchlist_v1_${uid}` in localStorage.
* **Details**: Adding/removing tickers is persisted across reloads.

### 2. Saved Narratives / Research Notes
* **Verdict**: **Partially Implemented (In-Memory Only)**
* **File Path**: [NoteEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/NoteEngine.ts)
* **Details**: Programmatic saving of notes works via `NoteEngine.saveNote(symbol, note)` but is stored in a static record class variable and resets upon browser reload.

### 3. Offline Cache Bookmarks
* **Verdict**: **Implemented**
* **File Path**: [OfflineEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/OfflineEngine.ts)
* **Storage Key**: `offline_cache_${symbol}` in localStorage.
* **Details**: Bookmarks asset data for low-latency offline retrieval.

### 4. Saved Workspaces / Team Members
* **Verdict**: **Partially Implemented (In-Memory Only)**
* **File Path**: [WorkspaceEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/portfolio/WorkspaceEngine.ts)
* **Details**: Members list works in-memory via `WorkspaceEngine.inviteMember(name, role)` but resets on refresh.

### 5. Recent Searches
* **Verdict**: **Not Implemented (Handled in UI local state only)**
* **Details**: The autocomplete search center maintains its own temporary input value but has no persistent historical search log table or store.
