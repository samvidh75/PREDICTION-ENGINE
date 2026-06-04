# Live Data Elimination Audit: Reality Check

This audit profiles the exact data ingestion layers for all core subsystems within StockStory, highlighting mock vs. live feeds.

---

## 1. Subsystem Data Profiling

| Subsystem | Real Source | Fallback Source | Mock / Synthetic Source |
| :--- | :--- | :--- | :--- |
| **Stock Engine** | None | `StockRegistry` (Static Object) | `MASTER_STOCK_REGISTRY` |
| **Telemetry** | None | `TelemetrySnapshotFactory` | `mockTelemetrySnapshot` |
| **Portfolio** | None | `PortfolioEngine` | `PortfolioSnapshotFactory.createSnapshot()` |
| **Discovery** | None | `DiscoveryEngine` | Hardcoded sector list |
| **Stories** | None | `STORIES` constant | Dynamic interval refreshes |
| **News** | None | `NewsCoordinator` | `mockNewsItems` (Static seed array) |
| **Copilot** | None | Local Mock Responses | hardcoded chat arrays |

---

## 2. Ingestion Resolution & Action Plan

> [!WARNING]
> **Data Quality Risk**: Currently, 100% of all real-time visual streams (Telemetry gauges, active price changes, charts) are powered by mock seed generators to safeguard client-side latency. While perfect for RC1 styling, dynamic data bridges must be wired to target endpoints before full launch.

### Target API Endpoints for Production
1. **Stock Prices & Charts**: Wire `MarketDataOrchestrator.ts` directly to the `AlphaVantageFetcher` / Yahoo Finance REST nodes already present in `src/core/data/`.
2. **Important News & Sentiment**: Hook the `NewsCoordinator` to an external NewsAPI endpoint, feeding live RSS updates directly into the homepage feed.
3. **AI Copilot Context**: Expand target prompts to pull active ticker profiles directly from BSE/NSE metadata nodes rather than relying on local fallback heuristics.
