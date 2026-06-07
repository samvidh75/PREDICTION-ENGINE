# Live Operations Dashboard — TRACK-44 Agent H

**Generated:** 2026-06-06T21:19:44.245Z
**Next Update:** Next morning check

---

## PROVIDER HEALTH

| Provider | Status | Details |
|----------|--------|---------|
| Yahoo Finance | 🔴 OFFLINE | Command failed: python "C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\scripts\yfinance_bridge.py" test
Python was not found; run without arguments to install from the Microsoft Store, |
| Screener.in | 🟢 REACHABLE | HTTP 200 |
| SQLite Database | 🟢 PRESENT | 32.46 MB |

---

## DATABASE STATUS

| Table | Rows | Target | Status |
|-------|------|--------|--------|
| daily_prices | 37140 | > 120,000 | ⬜ |
| financial_snapshots | 0 | > 500 | ⬜ |
| prediction_registry | 106920 | > 1,000 | ✅ MET |
| master_security_registry | 0 | 100+ | — |
| daily_prediction_snapshots | 0 | — | — |

**Total Data Rows:** 144,060
**Database Size:** 32.46 MB
**Last Modified:** 2026-06-06T21:17:04.703Z

---

## DATA FRESHNESS

| Metric | Value |
|--------|-------|
| Latest Daily Price | 2026-06-05 |
| Days Since Last Price | 1 |
| Database Age | 2026-06-06T21:17:04.703Z |

---

## COVERAGE

| Metric | Count | % |
|--------|-------|---|
| Registered Symbols | 0 | 100% |
| With Price Data | 30 | 0% |
| With Financial Data | 0 | 0% |
| With Predictions | 30 | 0% |

---

## FAILED SYMBOLS (no price data)

None — all registered symbols have price data ✅



---

## PREDICTION STATS

| Metric | Value |
|--------|-------|
| Total Predictions | 106920 |
| Validated | 0 |
| Pending | 106920 |
| Latest Prediction Date | 2026-06-05 |

### By Horizon

| Horizon (days) | Count |
|---------------|-------|
| 30 | 35640 |
| 90 | 35640 |
| 365 | 35640 |

---

## MORNING CHECKLIST

- [ ] Provider Health: Yahoo ❌ | Screener ✅
- [ ] Database: ✅ 32.46 MB
- [ ] Daily Prices: ⚠ 37,140 rows
- [ ] Financials: ⚠ 0 snapshots
- [ ] Predictions: ✅ 106920 predictions
- [ ] Data Freshness: 2026-06-05 ✅
- [ ] Failed Symbols: 0 ✅

---

## ALERTS

🔴 **YAHOO OFFLINE** — Data refresh will fail. Check yfinance_bridge.py.



⚠ Daily prices below target (120K). Run Agent C expansion.

⚠ Financial snapshots below target (500). Run Agent B expansion.




