# StockStory — Opportunity Discovery Engine Report

This report outlines the algorithms and ranking criteria used to identify investment opportunities and warning signs in the market.

---

## 1. Discovery Categories

The engine scans the entire database of 505 real Indian securities to identify four distinct classes of market behavior:

* **Top Improving Companies**: Stocks with the highest positive change in their aggregate Factor Score over the past 30 days (e.g. rising from 50 to 75).
* **Top Deteriorating Companies**: Stocks with the highest negative drop in their aggregate Factor Score, highlighting potential structural weaknesses.
* **Sector Leaders**: The highest Quality and Momentum scored stocks in each sector (e.g. HAL leading Defense, HDFCBANK leading Banking).
* **Sector Laggards**: The lowest-rated stocks in each sector, warning users about weak performers.

---

## 2. Mathematical Ranking Criteria

We rank opportunities by comparing factor scores over a 30-day window ($t_{-30}$ to $t_0$):

$$\Delta S = \text{Score}(t_0) - \text{Score}(t_{-30})$$

* **Improving (Momentum/Quality Breakout)**: Ranked by sorting $\Delta S$ in descending order.
* **Deteriorating (Risk/Valuation Breakdown)**: Ranked by sorting $\Delta S$ in ascending order.
* **Sector Leader/Laggard**: Calculated using:

$$\text{Sector Rank} = 0.5 \times \text{Quality} + 0.3 \times \text{Momentum} + 0.2 \times \text{Sector Strength}$$
