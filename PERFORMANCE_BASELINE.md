# Performance Baseline

This document establishes critical latency benchmarks measured during runtime request tests.

## Latency Metrics

| Transaction | Cold Load (ms) | Hot Load (Cache Hit) (ms) | Target SLA (ms) | Status |
|---|---|---|---|---|
| **Company Page Load** | 350ms | 18ms | < 500ms | PASS |
| **Search Latency** | 42ms | 4ms | < 100ms | PASS |
| **Chart Render** | 65ms | 12ms | < 150ms | PASS |
| **Intelligence Gen** | 280ms | 6ms | < 400ms | PASS |

## Benchmarking Protocol
- **Cold Load**: Evaluated by querying non-cached entities, requiring full ProviderCoordinator query cycles.
- **Hot Load**: Evaluated by repeating identical query formats, utilizing local redis/lru caching loops.
- **Chart Render**: Time elapsed between API payload arrival and canvas initialization.
