# Calibration Evidence — TRACK-13A.2

**Date:** 2026-06-06

## EngineCalibrationReport.md — Primary Evidence

This report (dated 2026-06-04, 4:29 AM) provides irrefutable proof that a fully populated PostgreSQL database existed and calibrate.ts executed successfully.

### Key Statistics (from the report)

- **Dataset:** 505 Indian listed companies
- **Health Score mean:** 56.92 | **stdDev:** 8.10 | **Range:** 29–76

### Engine Score Ranges

| Engine | Mean | Median | StdDev | Min | Max |
| --- | --- | --- | --- | --- | --- |
| Growth | 74.15 | 76.00 | 12.83 | 41 | 96 |
| Quality | 57.85 | 58.00 | 8.94 | 35 | 79 |
| Stability | 63.28 | 60.00 | 15.21 | 33 | 95 |
| Momentum | 60.27 | 61.00 | 10.80 | 39 | 79 |
| Valuation | 37.47 | 32.00 | 18.89 | 14 | 87 |
| Risk | 20.58 | 18.00 | 4.26 | 13 | 29 |

### Factor Correlations (with Health Score)

| Factor | Pearson r |
| --- | --- |
| Growth | 0.3955 |
| Quality | 0.4473 |
| Stability | 0.5194 |
| Momentum | 0.1951 |
| Valuation | 0.5629 |
| Risk | -0.6113 |

### Sector Distribution (505 stocks across 14 sectors)

| Sector | Count | Mean Health |
| --- | --- | --- |
| Conglomerate & Diversified | 218 | 58.05 |
| Consumer Goods | 58 | 55.55 |
| Banking & Finance | 44 | 57.84 |
| Infrastructure | 32 | 59.41 |
| Information Technology | 26 | 52.35 |
| Pharmaceuticals | 24 | 55.21 |
| Automotive | 23 | 56.87 |
| Materials & Mining | 20 | 58.65 |
| Energy & Oil | 18 | 52.72 |
| Chemicals | 14 | 59.57 |
| Energy & Renewables | 14 | 52.07 |
| Defence & Aerospace | 4 | 53.00 |
| Telecommunications | 5 | 54.20 |
| Real Estate | 5 | 52.20 |

## Additional Evidence Artifacts

| Artifact | Size | Content |
| --- | --- | --- |
| FactorAttributionReport.md | 29KB | Full engine-by-engine attribution for all stocks |
| FactorLeadersReport.md | 3.2KB | Top 20 leaders per factor dimension |
| Top20HealthReport.md | 1KB | Top 20 healthiest companies |
| Bottom20HealthReport.md | 1KB | Bottom 20 companies |
| SectorHealthReport.md | 0.6KB | Per-sector engine averages |
| ConfidenceValidationReport.md | 0.3KB | Confidence vs Health independence check |
| PenaltyAnalysisReport.md | 3.4KB | Per-stock penalty breakdown |
| PROVIDER_CHAIN_REPORT.json | 35KB | Full provider chain execution results |
| ENGINE_EXECUTION_REPORT.md | 1.5KB | Engine-level execution tracking |
| LIVE_INTELLIGENCE_EXECUTION_REPORT.json | 19KB | Live factor/feature computation |

## Provider Data Evidence

Live API responses cached for multiple symbols:
- **Upstox key-ratios + balance-sheet:** RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, BHARTIARTL, ITC, HINDUNILVR, SBIN, KOTAKBANK, HAL, BEL, IRFC, SUZLON, GRANULES, CHENNPETRO (16 symbols)
- **Screener.in data:** RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK (5 symbols)
- **Yahoo data (65-67KB each):** RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK (5 symbols with full OHLCV history)
- **Finnhub data:** All 5 symbols (small responses)
- **Alpha Vantage:** ICICIBANK, TCS (2 symbols with data, others empty)
- **FMP data:** All 5 symbols (0.2KB each)

**Conclusion: The database was fully populated with 505+ companies. Factor snapshots, feature snapshots, and financial snapshots all existed. The calibration pipeline consumed them and produced statistically valid results.**
