# TRACK-30 Phase 6: Ranking Drift Analysis

## Status: **INSUFFICIENT EVIDENCE**

Ranking drift requires multiple ranking snapshots over time. Currently we have:
- ✅ ONE baseline snapshot (today — 2026-06-06)
- ❌ NO prior ranking snapshots stored
- ✅ Engine scoring is deterministic (same inputs = same outputs)

Drift would occur when:
1. Financial data updates (quarterly earnings → PE/PB/ROE changes)
2. Price movements → technical indicators change (RSI, MACD, volatility)
3. Provider data refreshes → new snapshots replace old values

Without stored historical rankings, drift cannot be measured.

### Recommendation
Store rankings weekly in the prediction_registry table. After 4+ weeks, compute ranking drift (Kendall's tau, score correlation, sector rotation).
