# StockStory — Alert Engine Report

This report documents the architectural design, alert trigger thresholds, and delivery specifications of the **Alert Engine**.

---

## 1. Alert Trigger Matrix

The system monitors five distinct alert triggers to keep investors informed of changes in their holdings and watchlists:

| Trigger Class | Metric Monitored | Threshold Condition | Alert Severity |
| :--- | :--- | :--- | :--- |
| **Factor Score Change** | Quality / Value / Growth | Absolute change of `> 10 points` in factor snapshot | Medium |
| **Momentum Change** | RSI / MACD Signal | RSI crossing `30` (Oversold) or `70` (Overbought) | High |
| **Risk Increase** | Volatility / Beta / ATR | Volatility multiple increase of `> 25%` | High |
| **Sentiment Shift** | News Sentiment Score | Sentiment change from positive to negative | Medium |
| **Regime Change** | Market Mood Index | Transition from Bullish/Bearish state | Critical |

---

## 2. Notification Pipeline

Alerts are stored in a local SQLite/PostgreSQL table and pushed to the UI via an event-driven system:

```
  Data Pipeline:
  Daily Data Sync --> Factor Engine Calc --> Alert Evaluator --> Database Insert --> Event Push --> UI Alert Center
```

* **UI Alert Center**: Renders alerts inside the Watchlist Centre and Dashboard views.
* **Alert Resolution**: Users can mark alerts as "read" or "archive" to clear clutter.
* **Persistent History**: Keeps a historical ledger of factor alerts for auditing past triggers.
