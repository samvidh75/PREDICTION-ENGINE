# Post-Beta Roadmap

This roadmap ranks post-beta enhancement items into P0, P1, and P2 priority cycles.

---

## P0: CRITICAL RESILIENCE & DATA SYSTEMS

* **Robust Database Failovers**:
  - Integrate master-slave replication and automated failover detection logic inside the Fastify database connection pool.
  - Implement dynamic fallback queries targeting backup static datasets during database downtime.

* **API Caching Layer**:
  - Implement Redis-backed cache servers on Render to cache results of `/api/intelligence/company/:symbol` and `/api/company/:symbol/financials`.
  - Cache static sectors data globally to reduce Postgres query frequency on large concurrent loads.

* **Global Session Monitoring**:
  - Log and monitor authentication tokens and session lifespans securely to detect anomalous access trends.

---

## P1: UX DENSITY & CHART ENHANCEMENTS

* **Interactive Technical Overlays**:
  - Add Bollinger Bands, MACD histograms, and RSI levels as toggleable canvas layers inside `VOSChart.tsx`.
  - Optimize canvas line drawing algorithms for larger datasets.

* **Alert Push Notifications**:
  - Integrate Firebase Cloud Messaging (FCM) to deliver push notifications directly to browsers when watchlist tickers experience score jumps.

* **Visual Theme Customizations**:
  - Enable custom dark/light theme options utilizing the core typography system.

---

## P2: PORTFOLIO & ASSISTANT EXTENSIONS

* **Multi-Asset Portfolio Integration**:
  - Expand portfolio services to support index ETFs, mutual funds, and derivative hedges alongside equities.

* **Interactive Chat Assistant**:
  - Re-integrate and refine AI-driven chat components to allow conversational inquiries (e.g. "Show me high-quality IT stocks in my watchlist").
