# AGENT F — Trust Centre V3 Status

## Implementation Plan
The Trust Centre exposes:
1. Historical Alpha — from PredictionRegistry validated predictions
2. Hit Rates — directional accuracy statistics
3. Sharpe Ratio — risk-adjusted return metrics
4. Calibration Report — confidence vs actual accuracy
5. Methodology — public document
6. Data Sources — transparency
7. Limitations — honest assessment
8. Research Disclosures — SEBI compliant

## Required Backend
- /api/trust/stats — aggregate prediction validation stats
- /api/trust/methodology — static methodology document
- /api/trust/calibration — confidence calibration report

## Frontend
- TrustCentrePage.tsx — needs creation
- Telemetry grid pattern with 6 metric cards
