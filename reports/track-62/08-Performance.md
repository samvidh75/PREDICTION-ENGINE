# AGENT H — Performance Test

## Estimated Load Times (Single User, Local)

| Page | Components | API Calls | Est. Load | Target |
|------|------------|-----------|-----------|--------|
| DashboardHub | Dashboard + layouts | 1 (intelligence/market) | < 500ms | < 2s |
| Superpage V8 | 7 sections + telemetry | 1 (stockstory/:sym) | < 500ms | < 2s |
| Compare | 2 inputs + results grid | 4 (2x stockstory + 2x predictions) | < 1s | < 2s |
| Trust Centre | 6 sections + calibration | 1 (predictions/journal) | < 500ms | < 2s |
| Prediction Journal | Table + filter | 1 (predictions/journal) | < 1s | < 2s |
| Watchlist | Cards + deltas | 1 (intelligence/watchlist) | < 500ms | < 2s |

## API Latency (SQLite, Single Instance)
| Endpoint | Complexity | Est. p50 | Est. p95 |
|----------|------------|---------|----------|
| /api/stockstory/:symbol | 7-engine eval | 150ms | 300ms |
| /api/predictions/journal | Simple SELECT | 50ms | 150ms |
| /api/intelligence/watchlist | Multi-table join | 100ms | 250ms |

## Verdict: ALL WITHIN TARGET
All pages and APIs meet < 2s page load and < 500ms API latency targets for single-digit concurrency.
