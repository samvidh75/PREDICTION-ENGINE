# Stock Coverage Validation Report

This validation inspects the routing, search, charting, and telemetry resolution for NSE, BSE, and SME listings across StockStory.

---

## 1. Coverage Statistics

* **Total Registered Symbols**: **9 active master tickers**
* **NSE Listings**: **7 (Reliance, HAL, BEL, IRFC, Granules, TCS, Infosys)**
* **BSE Listings**: **2 (Suzlon, Chennai Petroleum)**
* **SME Listings**: **0 active ( NSE EMERGE index card exists, but no individual SME listings are registered in local indexer)**

---

## 2. Feature Validation Status (Tested Tickers)

| Exchange | Ticker Symbol | Search Match | Routing | VOS Chart | Telemetry | Stories |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **NSE** | `RELIANCE` | ✓ (Fuzzy) | ✓ (Active) | ✓ (Rendered) | ✓ (Healthy) | ✓ (Documentary) |
| **NSE** | `HAL` | ✓ (Exact) | ✓ (Active) | ✓ (Rendered) | ✓ (Very Healthy) | ✓ (Brief) |
| **NSE** | `BEL` | ✓ (Exact) | ✓ (Active) | ✓ (Rendered) | ✓ (Very Healthy) | ✓ (Brief) |
| **BSE** | `SUZLON` | ✓ (Exact) | ✓ (Active) | ✓ (Rendered) | ✓ (Weakening) | × (Generic) |
| **BSE** | `CHENNPETRO` | ✓ (Fuzzy) | ✓ (Active) | ✓ (Rendered) | ✓ (Healthy) | × (Generic) |

---

## 3. Coverage Action Plan

> [!IMPORTANT]
> **Listing Scope Expansion**: Currently, only 9 premier assets are indexable in `StockRegistry`. To achieve production grade, we must expand `StockRegistry` to load a JSON mapping file of the Top 500 NSE and Top 500 BSE listings dynamically to enable instant search matches for large-cap assets.
