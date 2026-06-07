# Agent E — Drift Dashboard Design

## Metrics (from live-metrics.json)
- **30d**: 55.03% (n=34,980, CI=54.5%–55.5%)
- **90d**: 58.01% (n=33,810, CI=57.5%–58.5%)
- **365d**: 69.82% (n=28,170, CI=69.3%–70.4%)

## Dashboard Requirements
1. Show 30d/90d/365d hit rate TREND over time (monthly snapshots)
2. Display confidence interval bands
3. Flag when hit rate drops below historical minimum
4. Show last validation date prominently
5. Auto-refresh from live-metrics.json daily

## Current State
- Sample sizes: 30d=34,980, 365d=28,170 
- All metrics have sufficient power for publication
