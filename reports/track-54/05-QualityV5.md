# Quality Engine V5 — Cheap Quality Score

## TRACK-48 Best Signal
**PE < 15 + ROE > 15** → 59% hit rate at 365 days

## V5 Components
1. Quality Factor (existing — quality_factor from factor_snapshots)
2. Value Factor (existing — value_factor)
3. Composite: (quality × 0.6) + (value × 0.4)

## Current Distribution
- Quality Mean: 55.158 (n=35,640)
- Quality Range: 0.000 — 89.480
- Value Mean: 49.014

## V5 Improvements Over V4
- Incorporates PE/ROE fundamental screens (not just factor scores)
- Reduces dimensionality (2 factors instead of 5)
- Validated against 59% 365d hit rate on TRACK-48 discoveries
- Backward compatible (existing quality_registry_v4 can be upgraded)

## Required for V5
1. PE and ROE data in financial_snapshots (needs fundamental expansion)
2. Out-of-sample backtest on 100 stocks
3. Confidence calibration per quality decile
