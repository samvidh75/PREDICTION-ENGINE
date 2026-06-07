# SSI Replication Pack — TRACK-60
## Version: 1.0 | Date: 2026-06-07

### Quick Start
1. Open `stockstory.db` in any SQLite client
2. Run `docs/replication/verify_all.sql`
3. Compare output with expected values below

### Expected Values (as of 2026-06-07)
- 365d hit rate: 69.82%
- 30d hit rate: 55.03%
- Cheap Quality hit rate: 55.0%
- Total validated predictions: 34,980+

### Data Lineage
- fundamentals → Screener.in (ROE, ROCE, PE, Dividend Yield)
- market data → yfinance (daily OHLCV)
- predictions → SSI Prediction Engine (multi-factor + sector calibration)
- outcomes → Realised closing prices from daily_prices

### Methodology
Tracked in TRACK-48 (Discovery) → TRACK-51 (Build) → TRACK-53 (Audit) → TRACK-54 (Survival) → TRACK-59 (Rehabilitation)
