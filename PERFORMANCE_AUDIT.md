# PERFORMANCE_AUDIT

Evidence-based runtime performance audit.

## Search latency
- Measured latency: **39.1118 ms**
- Evidence:
  - Live `Measure-Command` against `GET /api/intelligence/company/RELIANCE` in the running backend.
- Assessment:
  - Search-related runtime is fast enough for interactive use.
  - This is only one sample and should be treated as a point-in-time measurement.

## Page load time
- Measured: **NOT VERIFIED**
- Evidence:
  - No browser page-load probe was run in this audit session.
- Assessment:
  - UI render paths were inspected from code, but no browser timing data was captured.

## Company page load time
- Measured: **NOT VERIFIED**
- Evidence:
  - `CompanySuperpage` was inspected and its backend/API dependencies were exercised, but no browser timing probe was captured.

## Intelligence generation time
- Measured: **PARTIAL**
- Evidence:
  - `reports/PROVIDER_CHAIN_REPORT.json`
  - Live `/api/intelligence/company/RELIANCE` response
- Observed timings from chain report:
  - Quote: ~114 ms
  - Metadata: ~968 ms
  - Historical: ~103 ms
  - News: ~1280 ms failed
  - Financials: ~1687 ms failed
- Assessment:
  - Generation is acceptable for quote/history.
  - News and financial generation are slow and currently failing due to provider issues.

## API response times
- `GET /healthz`
  - **Working**
  - Response returned immediately in audit session.
- `GET /api/market-data/company/RELIANCE`
  - **Working**
  - Live response returned successfully.
- `GET /api/intelligence/company/RELIANCE`
  - **Working**
  - Live response returned successfully.
- `GET /api/healthometer/state`
  - **Working**
  - Live response returned successfully.
- `GET /api/discovery/index`
  - **Working**
  - Live response returned successfully.
- `GET /api/search/universal`
  - **Working**
  - Live response returned successfully.

## Performance conclusions
- **Fastest confirmed path:** search/intelligence query execution, around 39 ms for the measured call.
- **Slowest confirmed paths:** Finnhub-driven news/financial requests, which are currently failing and taking ~1.2–1.7 s before failure.
- **Main performance bottleneck:** provider failures and fallback behavior, not UI computation.
- **Browser render performance:** not directly measured, so should remain **NOT VERIFIED**.
