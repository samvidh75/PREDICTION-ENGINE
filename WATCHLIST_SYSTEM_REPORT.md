# StockStory — Watchlist System Report

This report documents the design, capabilities, and system persistence architecture of StockStory's personal watchlist management suite.

---

## 1. Watchlist Categories & Profiles

StockStory provides five distinct watchlist vectors, enabling users to organize their exploration by investment strategy:

* **Personal Watchlists**: User-created custom lists tailored for personal conviction (e.g., "Long-Term Allocation", "Growth Opportunities").
* **Multiple Watchlists**: Multi-profile support allowing investors to maintain up to 20 separate watchlists, switching between contexts with a single tap.
* **Sector Watchlists**: Dynamic, automated watchlists mapping target sectors directly (e.g., grouping IT stocks like TCS and INFY together, or defense stocks like HAL).
* **Theme Watchlists**: Thematic collections based on factor characteristics (e.g., "High-Conviction Quality Leaders", "Attractive Valuations under Fair Value").
* **Portfolio Watchlists**: Synchronized lists mirroring the user's active holdings, ensuring their portfolio constituents are automatically tracked in real-time.

---

## 2. Core Operations & UI Support

To ensure a highly responsive workspace, the system supports the following actions on the frontend:

```
+------------+--------------------------------------------------------+---------------------------------------+
| Operation  | Description                                            | State Action                          |
+------------+--------------------------------------------------------+---------------------------------------+
| Add        | Add new stock ticker to active watchlist               | Appends symbol to localStorage index  |
| Remove     | Delete stock from watchlist                            | Filters out symbol from array         |
| Pin        | Pin favourite watchlists to the top of navigation      | Sets isFavourite boolean to true      |
| Sort       | Order assets by Factor Score, 1-Day change, or Name    | Client-side array sorting trigger     |
+------------+--------------------------------------------------------+---------------------------------------+
```

---

## 3. Storage & State Persistence Architecture

Watchlist states are stored on the client side using **user-scoped local storage keys**, ensuring secure offline persistence and fast load times:

```
  Local Storage Key Hierarchy:
  stockstory_watchlist_v1_[UserUID]
    └── [ { id: "1", name: "Defence", tickers: ["HAL"], isFavourite: true }, ... ]
```

* **Persistence Layer**: Hooked into the React state machine, synchronized across tabs via custom window event listeners (`subscribeWatchlist`).
* **Security & Isolation**: Keys are prefixed with the user's authenticated UID (`normaliseUid`), preventing profile bleed during multi-account switches on the same browser.
