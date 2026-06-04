# StockStory — Investor Memory Report

This report outlines the architecture used to store user bookmarks, search histories, and read narratives.

---

## 1. Saved Vectors & Bookmarks

To build a personalized workspace, the platform tracks five areas of user interaction:

* **Saved Companies**: Allows users to bookmark key securities for quick access on their dashboard.
* **Saved Insights**: Bookmarks high-impact insights and technical drivers for future reference.
* **Saved Sectors**: Lets users pin specific industry groups (e.g., Defense, Energy) to follow rotation trends.
* **Saved Narratives**: Bookmarks specific company narrative reports (e.g., long-term strategic plans).
* **Recent Searches**: Stores the user's latest 10 search queries to speed up navigation.

---

## 2. Sync & Storage Architecture

Data is stored locally on the client for low-latency queries, with support for cloud backup:

```
  Memory Flow:
  User Action (Bookmark) ──> localForage / LocalStorage ──> Cloud Sync ──> User Profile Store
```

* **Offline Compatibility**: Bookmarked narratives and insights are cached locally, allowing users to read them offline.
* **Privacy Isolation**: User bookmarks are isolated by user ID (`uid`), preventing data overlap during multi-account switches on the same browser.
